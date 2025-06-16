import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { Function, FunctionArgs } from "./function";
import { BusBaseSubscriberArgs } from "./bus-base-subscriber";
export interface Args extends BusBaseSubscriberArgs {
    /**
     * The subscriber function.
     */
    subscriber: Input<string | FunctionArgs>;
}
/**
 * The `BusLambdaSubscriber` component is internally used by the `Bus` component
 * to add subscriptions to [Amazon EventBridge Event Bus](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `Bus` component.
 */
export declare class BusLambdaSubscriber extends Component {
    private readonly fn;
    private readonly permission;
    private readonly rule;
    private readonly target;
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Lambda function that'll be notified.
         */
        readonly function: Output<Function>;
        /**
         * The Lambda permission.
         */
        permission: import("@pulumi/aws/lambda/permission").Permission;
        /**
         * The EventBus rule.
         */
        rule: import("@pulumi/aws/cloudwatch/eventRule").EventRule;
        /**
         * The EventBus target.
         */
        target: import("@pulumi/aws/cloudwatch/eventTarget").EventTarget;
    };
}
