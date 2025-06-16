import { output } from "@pulumi/pulumi";
import { toSeconds } from "../../duration";
import { isJSONata, State } from "./state";
/**
 * The `Wait` state is internally used by the `StepFunctions` component to add a [Wait
 * workflow state](https://docs.aws.amazon.com/step-functions/latest/dg/state-wait.html)
 * to a state machine.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `wait` method of the `StepFunctions` component.
 */
export class Wait extends State {
    constructor(args) {
        super(args);
        this.args = args;
    }
    /**
     * Add a next state to the `Wait` state. After the wait completes, it'll transition
     * to the given `state`.
     *
     * @example
     *
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.wait({
     *   name: "Wait",
     *   time: "10 seconds"
     * })
     * .next(state);
     * ```
     */
    next(state) {
        return this.addNext(state);
    }
    /**
     * Serialize the state into JSON state definition.
     */
    toJSON() {
        return {
            Type: "Wait",
            Seconds: this.args.time
                ? output(this.args.time).apply((t) => isJSONata(t) ? t : toSeconds(t))
                : undefined,
            Timestamp: this.args.timestamp,
            ...super.toJSON(),
        };
    }
}
