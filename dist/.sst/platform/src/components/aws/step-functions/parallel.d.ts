import { Input } from "../../input";
import { CatchArgs, Failable, Nextable, RetryArgs, State, StateArgs } from "./state";
export interface ParallelArgs extends StateArgs {
    /**
     * The arguments to be passed to the APIs of the connected resources. Values can
     * include outputs from other resources and JSONata expressions.
     *
     * @example
     *
     * ```ts
     * {
     *   arguments: {
     *     product: "{% $states.input.order.product %}",
     *     url: api.url,
     *     count: 32
     *   }
     * }
     * ```
     */
    arguments?: Input<Record<string, Input<any>>>;
}
/**
 * The `Parallel` state is internally used by the `StepFunctions` component to add a [Parallel
 * workflow state](https://docs.aws.amazon.com/step-functions/latest/dg/state-parallel.html)
 * to a state machine.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `parallel` method of the `StepFunctions` component.
 */
export declare class Parallel extends State implements Nextable, Failable {
    protected args: ParallelArgs;
    private branches;
    constructor(args: ParallelArgs);
    /**
     * Add a branch state to the `Parallel` state. Each branch runs concurrently.
     *
     * @param branch The state to add as a branch.
     *
     * @example
     *
     * ```ts title="sst.config.ts"
     * const parallel = sst.aws.StepFunctions.parallel({ name: "Parallel" });
     *
     * parallel.branch(processorA);
     * parallel.branch(processorB);
     * ```
     */
    branch(branch: State): this;
    /**
     * Add a next state to the `Parallel` state. If all branches complete successfully,
     * this'll continue execution to the given `state`.
     *
     * @param state The state to transition to.
     *
     * @example
     *
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.parallel({
     *   // ...
     * })
     * .next(state);
     * ```
     */
    next<T extends State>(state: T): T;
    /**
     * Add a retry behavior to the `Parallel` state. If the state fails with any of the
     * specified errors, retry execution using the specified parameters.
     *
     * @param args Properties to define the retry behavior.
     *
     * @example
     *
     * This defaults to.
     *
     * ```ts title="sst.config.ts" {5-8}
     * sst.aws.StepFunctions.parallel({
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
    retry(args?: RetryArgs): this;
    /**
     * Add a catch behavior to the `Parallel` state. So if the state fails with any
     * of the specified errors, it'll continue execution to the given `state`.
     *
     * @param state The state to transition to on error.
     * @param args Properties to customize error handling.
     *
     * @example
     *
     * This defaults to.
     *
     * ```ts title="sst.config.ts" {5}
     * sst.aws.StepFunctions.parallel({
     *   // ...
     * })
     * .catch({
     *   errors: ["States.ALL"]
     * });
     * ```
     */
    catch(state: State, args?: CatchArgs): this;
    /**
     * @internal
     */
    getPermissions(): import("..").FunctionPermissionArgs[];
    /**
     * Serialize the state into JSON state definition.
     */
    protected toJSON(): {
        Type: string;
        Branches: {
            StartAt: string;
            States: Record<string, any>;
        }[];
    };
}
