import { JSONata, State, StateArgs } from "./state";
export interface ChoiceArgs extends StateArgs {
}
/**
 * The `Choice` state is internally used by the `StepFunctions` component to add a [Choice
 * workflow state](https://docs.aws.amazon.com/step-functions/latest/dg/state-choice.html)
 * to a state machine.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `choice` method of the `StepFunctions` component.
 */
export declare class Choice extends State {
    protected args: ChoiceArgs;
    private choices;
    private defaultNext?;
    constructor(args: ChoiceArgs);
    /**
     * Add a matching condition to the `Choice` state. If the given condition matches,
     * it'll continue execution to the given state.
     *
     * The condition needs to be a JSONata expression that evaluates to a boolean.
     *
     * @example
     *
     * ```ts
     * sst.aws.StepFunctions.choice({
     *   // ...
     * })
     * .when(
     *   "{% $states.input.status === 'unpaid' %}",
     *   state
     * );
     * ```
     *
     * @param condition The JSONata condition to evaluate.
     * @param next The state to transition to.
     */
    when(condition: JSONata, next: State): this;
    /**
     * Add a default next state to the `Choice` state. If no other condition matches,
     * continue execution with the given state.
     */
    otherwise(next: State): this;
    /**
     * @internal
     */
    assertStateNameUnique(states?: Map<string, State>): void;
    /**
     * @internal
     */
    assertStateNotReused(states?: Map<State, string>, graphId?: string): void;
    /**
     * @internal
     */
    getPermissions(): import("..").FunctionPermissionArgs[];
    /**
     * @internal
     */
    serialize(): {};
    protected toJSON(): {
        End: undefined;
        Type: string;
        Choices: {
            Condition: `{% ${string} %}`;
            Next: string;
        }[];
        Default: string | undefined;
    };
}
