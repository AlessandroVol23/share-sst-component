import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { Function, FunctionArgs } from "./function";
import { SnsTopicSubscriberArgs } from "./sns-topic";
export interface Args extends SnsTopicSubscriberArgs {
    /**
     * The Topic to use.
     */
    topic: Input<{
        /**
         * The ARN of the Topic.
         */
        arn: Input<string>;
    }>;
    /**
     * The subscriber function.
     */
    subscriber: Input<string | FunctionArgs>;
}
/**
 * The `SnsTopicLambdaSubscriber` component is internally used by the `SnsTopic` component
 * to add subscriptions to your [Amazon SNS Topic](https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `SnsTopic` component.
 */
export declare class SnsTopicLambdaSubscriber extends Component {
    private readonly fn;
    private readonly permission;
    private readonly subscription;
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
         * The SNS Topic subscription.
         */
        subscription: import("@pulumi/aws/sns/topicSubscription").TopicSubscription;
    };
}
