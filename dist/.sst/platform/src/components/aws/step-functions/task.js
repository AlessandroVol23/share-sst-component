import { all, output } from "@pulumi/pulumi";
import { toSeconds } from "../../duration";
import { isJSONata, State, } from "./state";
/**
 * The `Task` state is internally used by the `StepFunctions` component to add a [Task
 * workflow state](https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html)
 * to a state machine.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `task` method of the `StepFunctions`
 * component.
 *
 * It's also returned by convenience methods like `lambdaInvoke`, `snsPublish`,
 * `sqsSendMessage`, and more.
 */
export class Task extends State {
    constructor(args) {
        super(args);
        this.args = args;
        const integration = output(this.args.integration ?? "response");
        this.resource = all([this.args.resource, integration]).apply(([resource, integration]) => {
            if (integration === "sync" && !resource.endsWith(".sync"))
                return `${resource}.sync`;
            if (integration === "token" && !resource.endsWith(".waitForTaskToken"))
                return `${resource}.waitForTaskToken`;
            return resource;
        });
    }
    /**
     * Add a next state to the `Task` state. If the state completes successfully,
     * continue execution to the given `state`.
     *
     * @param state The state to transition to.
     *
     * @example
     *
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.task({
     *   // ...
     * })
     * .next(state);
     * ```
     */
    next(state) {
        return this.addNext(state);
    }
    /**
     * Add a retry behavior to the `Task` state. If the state fails with any of the
     * specified errors, retry the execution.
     *
     * @param args Properties to define the retry behavior.
     *
     * @example
     *
     * This defaults to.
     *
     * ```ts title="sst.config.ts" {5-8}
     * sst.aws.StepFunctions.task({
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
     * Add a catch behavior to the `Task` state. So if the state fails with any of the
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
     * sst.aws.StepFunctions.task({
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
        return [...(this.args.permissions || []), ...super.getPermissions()];
    }
    /**
     * Serialize the state into JSON state definition.
     */
    toJSON() {
        return {
            Type: "Task",
            ...super.toJSON(),
            Resource: this.resource,
            Credentials: this.args.role && {
                RoleArn: this.args.role,
            },
            Timeout: this.args.timeout
                ? output(this.args.timeout).apply((t) => isJSONata(t) ? t : toSeconds(t))
                : undefined,
            Arguments: this.args.arguments,
        };
    }
}
