import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { SnsTopicSubscriberArgs } from "./sns-topic";
import { Queue } from "./queue";
export interface Args extends SnsTopicSubscriberArgs {
    /**
     * The SNS Topic to use.
     */
    topic: Input<{
        /**
         * The ARN of the SNS Topic.
         */
        arn: Input<string>;
    }>;
    /**
     * The ARN of the SQS Queue.
     */
    queue: Input<string | Queue>;
    /**
     * In early versions of SST, parent were forgotten to be set for resources in components.
     * This flag is used to disable the automatic setting of the parent to prevent breaking
     * changes.
     * @internal
     */
    disableParent?: boolean;
}
/**
 * The `SnsTopicQueueSubscriber` component is internally used by the `SnsTopic` component
 * to add subscriptions to your [Amazon SNS Topic](https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribeQueue` method of the `SnsTopic` component.
 */
export declare class SnsTopicQueueSubscriber extends Component {
    private readonly policy;
    private readonly subscription;
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The SQS Queue policy.
         */
        policy: import("@pulumi/aws/sqs/queuePolicy").QueuePolicy;
        /**
         * The SNS Topic subscription.
         */
        subscription: import("@pulumi/aws/sns/topicSubscription").TopicSubscription;
    };
}
