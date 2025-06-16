import { Duration } from "../../duration";
import { Input } from "../../input";
import { FunctionPermissionArgs } from "../function";
export type JSONata = `{% ${string} %}`;
export declare function isJSONata(value: string): boolean;
/**
 * @internal
 */
export interface Nextable {
    next: (state: State) => State;
}
/**
 * @internal
 */
export interface Failable {
    retry: (props?: RetryArgs) => State;
    catch: (state: State, props?: CatchArgs) => State;
}
export interface RetryArgs {
    /**
     * A list of errors that are being retried. By default, this retries all errors.
     *
     * @default `["States.ALL"]`
     */
    errors?: string[];
    /**
     * The amount of time to wait before the first retry attempt. The maximum value is
     * `99999999 seconds`.
     *
     * Following attempts will retry based on the `backoffRate` multiplier.
     *
     * @default `"1 second"`
     */
    interval?: Duration;
    /**
     * The maximum number of retries before it falls back to the normal error handling.
     *
     * A value of `0` means the error won't be retried. The maximum value is
     * `99999999`.
     *
     * @default `3`
     */
    maxAttempts?: number;
    /**
     * The backoff rate. This is a multiplier that increases the interval between
     * retries.
     *
     * For example, if the interval is `1 second` and the backoff rate is `2`, the
     * first retry will happen after `1 second`, and the second retry will happen
     * after `2 * 1 second = 2 seconds`.
     *
     * @default `2`
     */
    backoffRate?: number;
}
export interface CatchArgs {
    /**
     * A list of errors that are being caught. By default, this catches all errors.
     *
     * @default `["States.ALL"]`
     */
    errors?: string[];
}
export interface StateArgs {
    /**
     * The name of the state. This needs to be unique within the state machine.
     */
    name: string;
    /**
     * Optionally add a comment that describes the state.
     * @internal
     */
    comment?: Input<string>;
    /**
     * Transform the output of the state. When specified, the value overrides the
     * default output from the state.
     *
     * This takes any JSON value; object, array, string, number, boolean, null.
     *
     * ```ts
     * {
     *   output: {
     *     charged: true
     *   }
     * }
     * ```
     *
     * Or, you can pass in a JSONata expression.
     *
     * ```ts
     * {
     *   output: {
     *     product: "{% $states.input.product %}"
     *   }
     * }
     * ```
     *
     * Learn more about [transforming data with JSONata](https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html).
     */
    output?: Input<JSONata | Record<string, any>>;
    /**
     * Store variables that can be accessed by any state later in the workflow,
     * instead of passing it through each state.
     *
     * This takes a set of key/value pairs. Where the key is the name of the variable
     * that can be accessed by any subsequent state.
     *
     * @example
     *
     * The value can be any JSON value; object, array, string, number, boolean, null.
     *
     * ```ts
     * {
     *   assign: {
     *     productName: "product1",
     *     count: 42,
     *     available: true
     *   }
     * }
     * ```
     *
     * Or, you can pass in a JSONata expression.
     *
     * ```ts
     * {
     *   assign: {
     *     product: "{% $states.input.order.product %}",
     *     currentPrice: "{% $states.result.Payload.current_price %}"
     *   }
     * }
     * ```
     *
     * Learn more about [passing data between states with variables](https://docs.aws.amazon.com/step-functions/latest/dg/workflow-variables.html).
     */
    assign?: Record<string, any>;
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
export declare abstract class State {
    protected args: StateArgs;
    protected _parentGraphState?: State;
    protected _childGraphStates: State[];
    protected _prevState?: State;
    protected _nextState?: State;
    protected _retries?: RetryArgs[];
    protected _catches?: {
        next: State;
        props: CatchArgs;
    }[];
    constructor(args: StateArgs);
    protected addChildGraph<T extends State>(state: T): T;
    protected addNext<T extends State>(state: T): T;
    protected addRetry(args?: RetryArgs): this;
    protected addCatch(state: State, args?: CatchArgs): this;
    /**
     * @internal
     */
    get name(): string;
    /**
     * @internal
     */
    getRoot(): State;
    /**
     * @internal
     */
    getHead(): State;
    /**
     * Assert that the state name is unique.
     * @internal
     */
    assertStateNameUnique(states?: Map<string, State>): void;
    /**
     * Assert that the state is not reused.
     * @internal
     */
    assertStateNotReused(states?: Map<State, string>, graphId?: string): void;
    /**
     * Get the permissions required for the state.
     * @internal
     */
    getPermissions(): FunctionPermissionArgs[];
    /**
     * Serialize the state into JSON state definition.
     * @internal
     */
    serialize(): Record<string, any>;
    protected toJSON(): Record<string, any>;
}
