import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { Function, FunctionArgs } from "./function";
import { RealtimeSubscriberArgs } from "./realtime";
export interface Args extends RealtimeSubscriberArgs {
    /**
     * The IoT WebSocket server to use.
     */
    iot: Input<{
        /**
         * The name of the Realtime component.
         */
        name: Input<string>;
    }>;
    /**
     * The subscriber function.
     */
    subscriber: Input<string | FunctionArgs>;
}
/**
 * The `RealtimeLambdaSubscriber` component is internally used by the `Realtime` component
 * to add subscriptions to the [AWS IoT endpoint](https://docs.aws.amazon.com/iot/latest/developerguide/what-is-aws-iot.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `Realtime` component.
 */
export declare class RealtimeLambdaSubscriber extends Component {
    private readonly fn;
    private readonly permission;
    private readonly rule;
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
         * The IoT Topic rule.
         */
        rule: import("@pulumi/aws/iot/topicRule").TopicRule;
    };
}
