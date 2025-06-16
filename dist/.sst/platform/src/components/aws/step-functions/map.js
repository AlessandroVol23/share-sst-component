import { output } from "@pulumi/pulumi";
import { State, } from "./state";
/**
 * The `Map` state is internally used by the `StepFunctions` component to add a [Map
 * workflow state](https://docs.aws.amazon.com/step-functions/latest/dg/state-map.html)
 * to a state machine.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `map` method of the `StepFunctions` component.
 */
export class Map extends State {
    constructor(args) {
        super(args);
        this.args = args;
        this.processor = args.processor.getHead();
        this.addChildGraph(this.processor);
        this.mode = output(args.mode ?? "inline");
    }
    /**
     * Add a next state to the `Map` state. If the state completes successfully,
     * continue execution to the given `state`.
     *
     * @param state The state to transition to.
     *
     * @example
     *
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.map({
     *   // ...
     * })
     * .next(state);
     * ```
     */
    next(state) {
        return this.addNext(state);
    }
    /**
     * Add a retry behavior to the `Map` state. If the state fails with any of the
     * specified errors, retry the execution.
     *
     * @param args Properties to define the retry behavior.
     *
     * @example
     *
     * This defaults to.
     *
     * ```ts title="sst.config.ts" {5-8}
     * sst.aws.StepFunctions.map({
     *   // ...
     * })
     * .retry({
     *   errors: ["States.ALL"],
     *   interval: "1 second",
     *   maxAttempts: 3,
     *   backoffRate: 2
     * });
     * ```
     */
    retry(args) {
        return this.addRetry(args);
    }
    /**
     * Add a catch behavior to the `Map` state. So if the state fails with any of the
     * specified errors, it'll continue execution to the given `state`.
     *
     * @param state The state to transition to on error.
     * @param args Properties to customize error handling.
     *
     * @example
     *
     * This defaults to.
     *
     * ```ts title="sst.config.ts" {5}
     * sst.aws.StepFunctions.map({
     *   // ...
     * })
     * .catch({
     *   errors: ["States.ALL"]
     * });
     * ```
     */
    catch(state, args = {}) {
        return this.addCatch(state, args);
    }
    /**
     * @internal
     */
    getPermissions() {
        return [...this.processor.getPermissions(), ...super.getPermissions()];
    }
    /**
     * Serialize the state into JSON state definition.
     */
    toJSON() {
        return {
            Type: "Map",
            Items: this.args.items,
            ItemSelector: this.args.itemSelector,
            ItemProcessor: {
                ProcessorConfig: this.mode.apply((mode) => mode === "inline"
                    ? { Mode: "INLINE" }
                    : { Mode: "DISTRIBUTED", ExecutionType: mode.toUpperCase() }),
                StartAt: this.processor.name,
                States: this.processor.serialize(),
            },
            MaxConcurrency: this.args.maxConcurrency,
            ...super.toJSON(),
        };
    }
}
