import { State, StateArgs } from "./state";
export interface SucceedArgs extends StateArgs {
}
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
export declare class Succeed extends State {
    protected args: SucceedArgs;
    constructor(args: SucceedArgs);
    /**
     * Serialize the state into JSON state definition.
     */
    protected toJSON(): {
        End: undefined;
        Type: string;
    };
}
