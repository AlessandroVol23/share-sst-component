import { State } from "./state";
/**
 * The `Fail` state is internally used by the `StepFunctions` component to add a
 * [Fail workflow state](https://docs.aws.amazon.com/step-functions/latest/dg/state-fail.html)
 * to a state machine.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `fail` method of the `StepFunctions` component.
 */
export class Fail extends State {
    constructor(args) {
        super(args);
        this.args = args;
    }
    /**
     * Serialize the state into JSON state definition.
     */
    toJSON() {
        return {
            Type: "Fail",
            Error: this.args.error,
            Cause: this.args.cause,
            ...super.toJSON(),
            End: undefined,
        };
    }
}
