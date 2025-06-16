import { State } from "./state";
/**
 * The `Succeed` state is internally used by the `StepFunctions` component to add a [Succeed
 * workflow state](https://docs.aws.amazon.com/step-functions/latest/dg/state-succeed.html)
 * to a state machine.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `succeed` method of the `StepFunctions` component.
 */
export class Succeed extends State {
    constructor(args) {
        super(args);
        this.args = args;
    }
    /**
     * Serialize the state into JSON state definition.
     */
    toJSON() {
        return {
            Type: "Succeed",
            ...super.toJSON(),
            End: undefined,
        };
    }
}
