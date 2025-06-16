import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { Function, FunctionArgs } from "./function";
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
     * The subscriber function.
     */
    subscriber: Input<string | FunctionArgs>;
}
/**
 * The `BucketLambdaSubscriber` component is internally used by the `Bucket` component to
 * add bucket notifications to [AWS S3 Bucket](https://aws.amazon.com/s3/).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `Bucket` component.
 */
export declare class BucketLambdaSubscriber extends Component {
    private readonly fn;
    private readonly permission;
    private readonly notification;
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
         * The S3 bucket notification.
         */
        notification: import("@pulumi/aws/s3/bucketNotification").BucketNotification;
    };
}
