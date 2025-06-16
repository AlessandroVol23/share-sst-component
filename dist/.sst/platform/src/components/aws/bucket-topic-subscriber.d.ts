import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { BucketSubscriberArgs } from "./bucket";
export interface Args extends BucketSubscriberArgs {
    /**
     * The bucket to use.
     */
    bucket: Input<{
        /**
         * The name of the bucket.
         */
        name: Input<string>;
        /**
         * The ARN of the bucket.
         */
        arn: Input<string>;
    }>;
    /**
     * The subscriber ID.
     */
    subscriberId: Input<string>;
    /**
     * The ARN of the SNS Topic.
     */
    topic: Input<string>;
}
/**
 * The `BucketTopicSubscriber` component is internally used by the `Bucket` component
 * to add subscriptions to your [AWS S3 Bucket](https://aws.amazon.com/s3/).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribeTopic` method of the `Bucket` component.
 */
export declare class BucketTopicSubscriber extends Component {
    private readonly policy;
    private readonly notification;
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The SNS Topic policy.
         */
        policy: import("@pulumi/aws/sns/topicPolicy").TopicPolicy;
        /**
         * The S3 Bucket notification.
         */
        notification: import("@pulumi/aws/s3/bucketNotification").BucketNotification;
    };
}
