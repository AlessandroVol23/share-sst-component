import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { BucketNotificationsArgs } from "./bucket";
export interface Args extends BucketNotificationsArgs {
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
}
/**
 * The `BucketNotification` component is internally used by the `Bucket` component to
 * add bucket notifications to [AWS S3 Bucket](https://aws.amazon.com/s3/).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `notify` method of the `Bucket` component.
 */
export declare class BucketNotification extends Component {
    private readonly functionBuilders;
    private readonly notification;
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The functions that will be notified.
         */
        readonly functions: Output<import("./function").Function[]>;
        /**
         * The notification resource that's created.
         */
        notification: import("@pulumi/aws/s3/bucketNotification").BucketNotification;
    };
}
