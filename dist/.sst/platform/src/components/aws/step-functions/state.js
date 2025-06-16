import { randomBytes } from "crypto";
import { toSeconds } from "../../duration";
export function isJSONata(value) {
    return value.startsWith("{%") && value.endsWith("%}");
}
/**
 * The `State` class is the base class for all states in `StepFunctions` state
 * machine.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * This is used for reference only.
 */
export class State {
    constructor(args) {
        this.args = args;
        this._childGraphStates = []; // only used for Parallel, Map
    }
    addChildGraph(state) {
        if (state._parentGraphState)
            throw new Error(`Cannot reuse the "${state.name}" state. States cannot be reused in Map or Parallel branches.`);
        this._childGraphStates.push(state);
        state._parentGraphState = this;
        return state;
    }
    addNext(state) {
        if (this._nextState)
            throw new Error(`The "${this.name}" state already has a next state. States cannot have multiple next states.`);
        this._nextState = state;
        state._prevState = this;
        return state;
    }
    addRetry(args) {
        this._retries = this._retries || [];
        this._retries.push({
            errors: ["States.ALL"],
            backoffRate: 2,
            interval: "1 second",
            maxAttempts: 3,
            ...args,
        });
        return this;
    }
    addCatch(state, args = {}) {
        this._catches = this._catches || [];
        this._catches.push({
            next: state.getHead(),
            props: {
                errors: args.errors ?? ["States.ALL"],
            },
        });
        return this;
    }
    /**
     * @internal
     */
    get name() {
        return this.args.name;
    }
    /**
     * @internal
     */
    getRoot() {
        return (this._prevState?.getRoot() ?? this._parentGraphState?.getRoot() ?? this);
    }
    /**
     * @internal
     */
    getHead() {
        return this._prevState?.getHead() ?? this;
    }
    /**
     * Assert that the state name is unique.
     * @internal
     */
    assertStateNameUnique(states = new Map()) {
        const existing = states.get(this.name);
        if (existing && existing !== this)
            throw new Error(`Multiple states with the same name "${this.name}". State names must be unique.`);
        states.set(this.name, this);
        this._nextState?.assertStateNameUnique(states);
        this._catches?.forEach((c) => c.next.assertStateNameUnique(states));
        this._childGraphStates.forEach((c) => c.assertStateNameUnique(states));
    }
    /**
     * Assert that the state is not reused.
     * @internal
     */
    assertStateNotReused(states = new Map(), graphId = "main") {
        const existing = states.get(this);
        if (existing && existing !== graphId)
            throw new Error(`Cannot reuse the "${this.name}" state. States cannot be reused in Map or Parallel branches.`);
        states.set(this, graphId);
        this._nextState?.assertStateNotReused(states, graphId);
        this._catches?.forEach((c) => c.next.assertStateNotReused(states, graphId));
        this._childGraphStates.forEach((c) => {
            const childGraphId = randomBytes(16).toString("hex");
            c.assertStateNotReused(states, childGraphId);
        });
    }
    /**
     * Get the permissions required for the state.
     * @internal
     */
    getPermissions() {
        return [
            ...(this._nextState?.getPermissions() || []),
            ...(this._catches || []).flatMap((c) => c.next.getPermissions()),
        ];
    }
    /**
     * Serialize the state into JSON state definition.
     * @internal
     */
    serialize() {
        return {
            [this.name]: this.toJSON(),
            ...this._nextState?.serialize(),
            ...this._catches?.reduce((acc, c) => ({ ...acc, ...c.next.serialize() }), {}),
        };
    }
    toJSON() {
        return {
            QueryLanguage: "JSONata",
            Comment: this.args.comment,
            Output: this.args.output,
            Assign: this.args.assign,
            ...(this._nextState ? { Next: this._nextState.name } : { End: true }),
            Retry: this._retries?.map((r) => ({
                ErrorEquals: r.errors,
                IntervalSeconds: toSeconds(r.interval),
                MaxAttempts: r.maxAttempts,
                BackoffRate: r.backoffRate,
            })),
            Catch: this._catches?.map((c) => ({
                ErrorEquals: c.props.errors,
                Next: c.next.name,
            })),
        };
    }
}
