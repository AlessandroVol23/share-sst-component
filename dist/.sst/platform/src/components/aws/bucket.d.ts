import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Prettify, Transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { FunctionArgs, FunctionArn } from "./function";
import { Duration } from "../duration";
import { BucketLambdaSubscriber } from "./bucket-lambda-subscriber";
import { s3 } from "@pulumi/aws";
import { BucketQueueSubscriber } from "./bucket-queue-subscriber";
import { BucketTopicSubscriber } from "./bucket-topic-subscriber";
import { Queue } from "./queue";
import { SnsTopic } from "./sns-topic";
import { BucketNotification } from "./bucket-notification";
interface BucketCorsArgs {
    /**
     * The HTTP headers that origins can include in requests to the bucket.
     * @default `["*"]`
     * @example
     * ```js
     * {
     *   cors: {
     *     allowHeaders: ["date", "keep-alive", "x-custom-header"]
     *   }
     * }
     * ```
     */
    allowHeaders?: Input<Input<string>[]>;
    /**
     * The origins that can access the bucket.
     * @default `["*"]`
     * @example
     * ```js
     * {
     *   cors: {
     *     allowOrigins: ["https://www.example.com", "http://localhost:60905"]
     *   }
     * }
     * ```
     * Or the wildcard for all origins.
     * ```js
     * {
     *   cors: {
     *     allowOrigins: ["*"]
     *   }
     * }
     * ```
     */
    allowOrigins?: Input<Input<string>[]>;
    /**
     * The HTTP methods that are allowed when calling the bucket.
     * @default `["DELETE" | "GET" | "HEAD" | "POST" | "PUT"]`
     * @example
     * ```js
     * {
     *   cors: {
     *     allowMethods: ["GET", "POST", "DELETE"]
     *   }
     * }
     * ```
     */
    allowMethods?: Input<Input<"DELETE" | "GET" | "HEAD" | "POST" | "PUT">[]>;
    /**
     * The HTTP headers you want to expose to an origin that calls the bucket.
     * @default `[]`
     * @example
     * ```js
     * {
     *   cors: {
     *     exposeHeaders: ["date", "keep-alive", "x-custom-header"]
     *   }
     * }
     * ```
     */
    exposeHeaders?: Input<Input<string>[]>;
    /**
     * The maximum amount of time the browser can cache results of a preflight request. By
     * default the browser doesn't cache the results. The maximum value is `86400 seconds` or `1 day`.
     * @default `"0 seconds"`
     * @example
     * ```js
     * {
     *   cors: {
     *     maxAge: "1 day"
     *   }
     * }
     * ```
     */
    maxAge?: Input<Duration>;
}
export interface BucketArgs {
    /**
     * Enable public read access for all the files in the bucket.
     *
     * :::tip
     * You don't need to enable this if you're using CloudFront to serve files from the bucket.
     * :::
     *
     * Should only be turned on if you want to host public files directly from the bucket.
     * @deprecated Use `access` instead.
     * @default `false`
     * @example
     * ```js
     * {
     *   public: true
     * }
     * ```
     */
    public?: Input<boolean>;
    /**
     * Enable public read access for all the files in the bucket. By default, no access is
     * granted.
     *
     * :::tip
     * If you are using the `Router` to serve files from this bucket, you need to allow
     * `cloudfront` access the bucket.
     * :::
     *
     * This adds a statement to the bucket policy that either allows `public` access or just
     * `cloudfront` access.
     *
     * @example
     * ```js
     * {
     *   access: "public"
     * }
     * ```
     */
    access?: Input<"public" | "cloudfront">;
    /**
     * Configure the policy for the bucket.
     *
     * @example
     * Restrict Access to Specific IP Addresses
     *
     * ```js
     * {
     *   policy: [{
     *     actions: ["s3:*"],
     *     principals: "*",
     *     conditions: [
     *       {
     *         test: "IpAddress",
     *         variable: "aws:SourceIp",
     *         values: ["10.0.0.0/16"]
     *       }
     *     ]
     *   }]
     * }
     * ```
     *
     * Allow Specific IAM User Access
     *
     * ```js
     * {
     *   policy: [{
     *     actions: ["s3:*"],
     *     principals: [{
     *       type: "aws",
     *       identifiers: ["arn:aws:iam::123456789012:user/specific-user"]
     *     }],
     *   }]
     * }
     * ```
     *
     * Cross-Account Access
     *
     * ```js
     * {
     *   policy: [{
     *     actions: ["s3:GetObject", "s3:ListBucket"],
     *     principals: [{
     *       type: "aws",
     *       identifiers: ["123456789012"]
     *     }],
     *   }]
     * }
     * ```
     */
    policy?: Input<Input<{
        /**
         * Configures whether the permission is allowed or denied.
         * @default `"allow"`
         * @example
         * ```ts
         * {
         *   effect: "deny"
         * }
         * ```
         */
        effect?: Input<"allow" | "deny">;
        /**
         * The [IAM actions](https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html#actions_table) that can be performed.
         * @example
         * ```js
         * {
         *   actions: ["s3:*"]
         * }
         * ```
         */
        actions: Input<Input<string>[]>;
        /**
         * The principals that can perform the actions.
         * @example
         * Allow anyone to perform the actions.
         *
         * ```js
         * {
         *   principals: "*"
         * }
         * ```
         *
         * Allow anyone within an AWS account.
         *
         * ```js
         * {
         *   principals: [{ type: "aws", identifiers: ["123456789012"] }]
         * }
         * ```
         *
         * Allow specific IAM roles.
         * ```js
         * {
         *   principals: [{
         *     type: "aws",
         *     identifiers: [
         *       "arn:aws:iam::123456789012:role/MyRole",
         *       "arn:aws:iam::123456789012:role/MyOtherRole"
         *     ]
         *   }]
         * }
         * ```
         *
         * Allow AWS CloudFront.
         * ```js
         * {
         *   principals: [{ type: "service", identifiers: ["cloudfront.amazonaws.com"] }]
         * }
         * ```
         *
         * Allow OIDC federated users.
         * ```js
         * {
         *   principals: [{
         *     type: "federated",
         *     identifiers: ["accounts.google.com"]
         *   }]
         * }
         * ```
         *
         * Allow SAML federated users.
         * ```js
         * {
         *   principals: [{
         *     type: "federated",
         *     identifiers: ["arn:aws:iam::123456789012:saml-provider/provider-name"]
         *   }]
         * }
         * ```
         *
         * Allow Canonical User IDs.
         * ```js
         * {
         *   principals: [{
         *     type: "canonical",
         *     identifiers: ["79a59df900b949e55d96a1e698fbacedfd6e09d98eacf8f8d5218e7cd47ef2be"]
         *   }]
         * }
         * ```
         *
         * Allow specific IAM users.
         *
         */
        principals: Input<"*" | Input<{
            type: Input<"aws" | "service" | "federated" | "canonical">;
            identifiers: Input<Input<string>[]>;
        }>[]>;
        /**
         * Configure specific conditions for when the policy is in effect.
         * @example
         * ```js
         * {
         *   conditions: [
         *     {
         *       test: "StringEquals",
         *       variable: "s3:x-amz-server-side-encryption",
         *       values: ["AES256"]
         *     }
         *   ]
         * }
         * ```
         */
        conditions?: Input<Input<{
            /**
             * Name of the [IAM condition operator](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html) to evaluate.
             */
            test: Input<string>;
            /**
             * Name of a [Context Variable](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#AvailableKeys) to apply the condition to. Context variables may either be standard AWS variables starting with `aws:` or service-specific variables prefixed with the service name.
             */
            variable: Input<string>;
            /**
             * The values to evaluate the condition against. If multiple values are provided, the condition matches if at least one of them applies. That is, AWS evaluates multiple values as though using an "OR" boolean operation.
             */
            values: Input<Input<string>[]>;
        }>[]>;
        /**
         * The S3 file paths that the policy is applied to. The paths are specified using
         * the [S3 path format](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-prefixes.html).
         * The bucket arn will be prepended to the paths when constructing the policy.
         * @default `["", "*"]`
         * @example
         * Apply the policy to the bucket itself.
         * ```js
         * {
         *   paths: [""]
         * }
         * ```
         *
         * Apply to all files in the bucket.
         * ```js
         * {
         *   paths: ["*"]
         * }
         * ```
         *
         * Apply to all files in the `images/` folder.
         * ```js
         * {
         *   paths: ["images/*"]
         * }
         * ```
         */
        paths?: Input<Input<string>[]>;
    }>[]>;
    /**
     * Enforce HTTPS for all requests to the bucket.
     *
     * By default, the bucket policy will automatically block any HTTP requests.
     * This is done using the `aws:SecureTransport` condition key.
     *
     * @default true
     * @example
     * ```js
     * {
     *   enforceHttps: false
     * }
     * ```
     */
    enforceHttps?: Input<boolean>;
    /**
     * The CORS configuration for the bucket. Defaults to `true`, which is the same as:
     *
     * ```js
     * {
     *   cors: {
     *     allowHeaders: ["*"],
     *     allowOrigins: ["*"],
     *     allowMethods: ["DELETE", "GET", "HEAD", "POST", "PUT"],
     *     exposeHeaders: [],
     *     maxAge: "0 seconds"
     *   }
     * }
     * ```
     *
     * @default `true`
     */
    cors?: Input<false | Prettify<BucketCorsArgs>>;
    /**
     * Enable versioning for the bucket.
     *
     * Bucket versioning enables you to store multiple versions of an object, protecting
     * against accidental deletion or overwriting.
     *
     * @default `false`
     * @example
     * ```js
     * {
     *   versioning: true
     * }
     * ```
     */
    versioning?: Input<boolean>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the S3 Bucket resource.
         */
        bucket?: Transform<s3.BucketV2Args>;
        /**
         * Transform the S3 Bucket CORS configuration resource.
         */
        cors?: Transform<s3.BucketCorsConfigurationV2Args>;
        /**
         * Transform the S3 Bucket Policy resource.
         */
        policy?: Transform<s3.BucketPolicyArgs>;
        /**
         * Transform the S3 Bucket versioning resource.
         */
        versioning?: Transform<s3.BucketVersioningV2Args>;
        /**
         * Transform the public access block resource that's attached to the Bucket.
         *
         * Returns `false` if the public access block resource should not be created.
         */
        publicAccessBlock?: Transform<s3.BucketPublicAccessBlockArgs> | false;
    };
}
export interface BucketNotificationsArgs {
    /**
     * A list of subscribers that'll be notified when events happen in the bucket.
     */
    notifications: Input<Input<{
        /**
         * The name of the subscriber.
         */
        name: Input<string>;
        /**
         * The function that'll be notified.
         *
         * @example
         * ```js
         * {
         *   name: "MySubscriber",
         *   function: "src/subscriber.handler"
         * }
         * ```
         *
         * Customize the subscriber function. The `link` ensures the subscriber can access the
         * bucket through the [SDK](/docs/reference/sdk/).
         *
         * ```js
         * {
         *   name: "MySubscriber",
         *   function: {
         *     handler: "src/subscriber.handler",
         *     timeout: "60 seconds",
         *     link: [bucket]
         *   }
         * }
         * ```
         *
         * Or pass in the ARN of an existing Lambda function.
         *
         * ```js
         * {
         *   name: "MySubscriber",
         *   function: "arn:aws:lambda:us-east-1:123456789012:function:my-function"
         * }
         * ```
         */
        function?: Input<string | FunctionArgs | FunctionArn>;
        /**
         * The Queue that'll be notified.
         *
         * @example
         * For example, let's say you have a queue.
         *
         * ```js title="sst.config.ts"
         * const myQueue = new sst.aws.Queue("MyQueue");
         * ```
         *
         * You can subscribe to this bucket with it.
         *
         * ```js
         * {
         *   name: "MySubscriber",
         *   queue: myQueue
         * }
         * ```
         *
         * Or pass in the ARN of an existing SQS queue.
         *
         * ```js
         * {
         *   name: "MySubscriber",
         *   queue: "arn:aws:sqs:us-east-1:123456789012:my-queue"
         * }
         * ```
         */
        queue?: Input<string | Queue>;
        /**
         * The SNS topic that'll be notified.
         *
         * @example
         * For example, let's say you have a topic.
         *
         * ```js title="sst.config.ts"
         * const myTopic = new sst.aws.SnsTopic("MyTopic");
         * ```
         *
         * You can subscribe to this bucket with it.
         *
         * ```js
         * {
         *   name: "MySubscriber",
         *   topic: myTopic
         * }
         * ```
         *
         * Or pass in the ARN of an existing SNS topic.
         *
         * ```js
         * {
         *   name: "MySubscriber",
         *   topic: "arn:aws:sns:us-east-1:123456789012:my-topic"
         * }
         * ```
         */
        topic?: Input<string | SnsTopic>;
        /**
         * A list of S3 event types that'll trigger a notification.
         * @default All S3 events
         * @example
         * ```js
         * {
         *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
         * }
         * ```
         */
        events?: Input<Input<"s3:ObjectCreated:*" | "s3:ObjectCreated:Put" | "s3:ObjectCreated:Post" | "s3:ObjectCreated:Copy" | "s3:ObjectCreated:CompleteMultipartUpload" | "s3:ObjectRemoved:*" | "s3:ObjectRemoved:Delete" | "s3:ObjectRemoved:DeleteMarkerCreated" | "s3:ObjectRestore:*" | "s3:ObjectRestore:Post" | "s3:ObjectRestore:Completed" | "s3:ObjectRestore:Delete" | "s3:ReducedRedundancyLostObject" | "s3:Replication:*" | "s3:Replication:OperationFailedReplication" | "s3:Replication:OperationMissedThreshold" | "s3:Replication:OperationReplicatedAfterThreshold" | "s3:Replication:OperationNotTracked" | "s3:LifecycleExpiration:*" | "s3:LifecycleExpiration:Delete" | "s3:LifecycleExpiration:DeleteMarkerCreated" | "s3:LifecycleTransition" | "s3:IntelligentTiering" | "s3:ObjectTagging:*" | "s3:ObjectTagging:Put" | "s3:ObjectTagging:Delete" | "s3:ObjectAcl:Put">[]>;
        /**
         * An S3 object key prefix that will trigger a notification.
         * @example
         * To be notified for all the objects in the `images/` folder.
         * ```js
         * {
         *   filterPrefix: "images/"
         * }
         * ```
         */
        filterPrefix?: Input<string>;
        /**
         * An S3 object key suffix that will trigger the notification.
         * @example
         * To be notified for all the objects with the `.jpg` suffix.
         * ```js
         * {
         *  filterSuffix: ".jpg"
         * }
         * ```
         */
        filterSuffix?: Input<string>;
    }>[]>;
    /**
     * [Transform](/docs/components#transform) how this notification creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the S3 Bucket Notification resource.
         */
        notification?: Transform<s3.BucketNotificationArgs>;
    };
}
/**
 * @internal
 */
export interface BucketSubscriberArgs {
    /**
     * A list of S3 event types that'll trigger the notification.
     * @default All S3 events
     * @example
     * ```js
     * {
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * }
     * ```
     */
    events?: Input<Input<"s3:ObjectCreated:*" | "s3:ObjectCreated:Put" | "s3:ObjectCreated:Post" | "s3:ObjectCreated:Copy" | "s3:ObjectCreated:CompleteMultipartUpload" | "s3:ObjectRemoved:*" | "s3:ObjectRemoved:Delete" | "s3:ObjectRemoved:DeleteMarkerCreated" | "s3:ObjectRestore:*" | "s3:ObjectRestore:Post" | "s3:ObjectRestore:Completed" | "s3:ObjectRestore:Delete" | "s3:ReducedRedundancyLostObject" | "s3:Replication:*" | "s3:Replication:OperationFailedReplication" | "s3:Replication:OperationMissedThreshold" | "s3:Replication:OperationReplicatedAfterThreshold" | "s3:Replication:OperationNotTracked" | "s3:LifecycleExpiration:*" | "s3:LifecycleExpiration:Delete" | "s3:LifecycleExpiration:DeleteMarkerCreated" | "s3:LifecycleTransition" | "s3:IntelligentTiering" | "s3:ObjectTagging:*" | "s3:ObjectTagging:Put" | "s3:ObjectTagging:Delete" | "s3:ObjectAcl:Put">[]>;
    /**
     * An S3 object key prefix that will trigger the notification.
     * @example
     * To filter for all the objects in the `images/` folder.
     * ```js
     * {
     *   filterPrefix: "images/"
     * }
     * ```
     */
    filterPrefix?: Input<string>;
    /**
     * An S3 object key suffix that will trigger the notification.
     * @example
     * To filter for all the objects with the `.jpg` suffix.
     * ```js
     * {
     *  filterSuffix: ".jpg"
     * }
     * ```
     */
    filterSuffix?: Input<string>;
    /**
     * [Transform](/docs/components#transform) how this notification creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the S3 Bucket Notification resource.
         */
        notification?: Transform<s3.BucketNotificationArgs>;
    };
}
/**
 * The `Bucket` component lets you add an [AWS S3 Bucket](https://aws.amazon.com/s3/) to
 * your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 * ```
 *
 * #### Public read access
 *
 * Enable `public` read access for all the files in the bucket. Useful for hosting public files.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Bucket("MyBucket", {
 *   access: "public"
 * });
 * ```
 *
 * #### Add a subscriber
 *
 * ```ts title="sst.config.ts"
 * bucket.notify({
 *   notifications: [
 *     {
 *       name: "MySubscriber",
 *       function: "src/subscriber.handler"
 *     }
 *   ]
 * });
 * ```
 *
 * #### Link the bucket to a resource
 *
 * You can link the bucket to other resources, like a function or your Next.js app.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * Once linked, you can generate a pre-signed URL to upload files in your app.
 *
 * ```ts title="app/page.tsx" {1,7}
 * import { Resource } from "sst";
 * import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
 * import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
 *
 * const command = new PutObjectCommand({
 *    Key: "file.txt",
 *    Bucket: Resource.MyBucket.name
 *  });
 *  await getSignedUrl(new S3Client({}), command);
 * ```
 */
export declare class Bucket extends Component implements Link.Linkable {
    private constructorName;
    private constructorOpts;
    private isSubscribed;
    private bucket;
    constructor(name: string, args?: BucketArgs, opts?: ComponentResourceOptions);
    /**
     * The generated name of the S3 Bucket.
     */
    get name(): Output<string>;
    /**
     * The domain name of the bucket. Has the format `${bucketName}.s3.amazonaws.com`.
     */
    get domain(): Output<string>;
    /**
     * The ARN of the S3 Bucket.
     */
    get arn(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon S3 bucket.
         */
        bucket: Output<import("@pulumi/aws/s3/bucketV2").BucketV2>;
    };
    /**
     * Reference an existing bucket with the given bucket name. This is useful when you
     * create a bucket in one stage and want to share it in another stage. It avoids having to
     * create a new bucket in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share buckets across stages.
     * :::
     *
     * @param name The name of the component.
     * @param bucketName The name of the existing S3 Bucket.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a bucket in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new bucket, you want to share the bucket from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const bucket = $app.stage === "frank"
     *   ? sst.aws.Bucket.get("MyBucket", "app-dev-mybucket-12345678")
     *   : new sst.aws.Bucket("MyBucket");
     * ```
     *
     * Here `app-dev-mybucket-12345678` is the auto-generated bucket name for the bucket created
     * in the `dev` stage. You can find this by outputting the bucket name in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   bucket: bucket.name
     * };
     * ```
     */
    static get(name: string, bucketName: string, opts?: ComponentResourceOptions): Bucket;
    /**
     * Subscribe to event notifications from this bucket. You can subscribe to these
     * notifications with a function, a queue, or a topic.
     *
     * @param args The config for the event notifications.
     *
     * @example
     *
     * For exmaple, to notify a function:
     *
     * ```js title="sst.config.ts" {5}
     * bucket.notify({
     *   notifications: [
     *     {
     *       name: "MySubscriber",
     *       function: "src/subscriber.handler"
     *     }
     *   ]
     * });
     * ```
     *
     * Or let's say you have a queue.
     *
     * ```js title="sst.config.ts"
     * const myQueue = new sst.aws.Queue("MyQueue");
     * ```
     *
     * You can notify it by passing in the queue.
     *
     * ```js title="sst.config.ts" {5}
     * bucket.notify({
     *   notifications: [
     *     {
     *       name: "MySubscriber",
     *       queue: myQueue
     *     }
     *   ]
     * });
     * ```
     *
     * Or let's say you have a topic.
     *
     * ```js title="sst.config.ts"
     * const myTopic = new sst.aws.SnsTopic("MyTopic");
     * ```
     *
     * You can notify it by passing in the topic.
     *
     * ```js title="sst.config.ts" {5}
     * bucket.notify({
     *   notifications: [
     *     {
     *       name: "MySubscriber",
     *       topic: myTopic
     *     }
     *   ]
     * });
     * ```
     *
     * You can also set it to only send notifications for specific S3 events.
     *
     * ```js {6}
     * bucket.notify({
     *   notifications: [
     *     {
     *       name: "MySubscriber",
     *       function: "src/subscriber.handler",
     *       events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     *     }
     *   ]
     * });
     * ```
     *
     * And you can add filters to be only notified from specific files in the bucket.
     *
     * ```js {6}
     * bucket.notify({
     *   notifications: [
     *     {
     *       name: "MySubscriber",
     *       function: "src/subscriber.handler",
     *       filterPrefix: "images/"
     *     }
     *   ]
     * });
     * ```
     */
    notify(args: BucketNotificationsArgs): BucketNotification;
    /**
     * Subscribe to events from this bucket.
     *
     * @deprecated The `notify` function is now the recommended way to subscribe to events
     * from this bucket. It allows you to configure multiple subscribers at once. To migrate,
     * remove the current subscriber, deploy the changes, and then add the subscriber
     * back using the new `notify` function.
     *
     * @param subscriber The function that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * ```js title="sst.config.ts"
     * bucket.subscribe("src/subscriber.handler");
     * ```
     *
     * Subscribe to specific S3 events. The `link` ensures the subscriber can access the bucket.
     *
     * ```js title="sst.config.ts" "link: [bucket]"
     * bucket.subscribe({
     *   handler: "src/subscriber.handler",
     *   link: [bucket]
     * }, {
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     *
     * Subscribe to specific S3 events from a specific folder.
     *
     * ```js title="sst.config.ts" {2}
     * bucket.subscribe("src/subscriber.handler", {
     *   filterPrefix: "images/",
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     *
     * Customize the subscriber function.
     *
     * ```js title="sst.config.ts"
     * bucket.subscribe({
     *   handler: "src/subscriber.handler",
     *   timeout: "60 seconds",
     * });
     * ```
     *
     * Or pass in the ARN of an existing Lambda function.
     *
     * ```js title="sst.config.ts"
     * bucket.subscribe("arn:aws:lambda:us-east-1:123456789012:function:my-function");
     * ```
     */
    subscribe(subscriber: Input<string | FunctionArgs | FunctionArn>, args?: BucketSubscriberArgs): Output<BucketLambdaSubscriber>;
    /**
     * Subscribe to events of an S3 bucket that was not created in your app.
     *
     * @deprecated The `notify` function is now the recommended way to subscribe to events
     * from this bucket. It allows you to configure multiple subscribers at once. To migrate,
     * remove the current subscriber, deploy the changes, and then add the subscriber
     * back using the new `notify` function.
     *
     * @param bucketArn The ARN of the S3 bucket to subscribe to.
     * @param subscriber The function that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have an existing S3 bucket with the following ARN.
     *
     * ```js title="sst.config.ts"
     * const bucketArn = "arn:aws:s3:::my-bucket";
     * ```
     *
     * You can subscribe to it by passing in the ARN.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Bucket.subscribe(bucketArn, "src/subscriber.handler");
     * ```
     *
     * Subscribe to specific S3 events.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Bucket.subscribe(bucketArn, "src/subscriber.handler", {
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     *
     * Subscribe to specific S3 events from a specific folder.
     *
     * ```js title="sst.config.ts" {2}
     * sst.aws.Bucket.subscribe(bucketArn, "src/subscriber.handler", {
     *   filterPrefix: "images/",
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     *
     * Customize the subscriber function.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Bucket.subscribe(bucketArn, {
     *   handler: "src/subscriber.handler",
     *   timeout: "60 seconds",
     * });
     * ```
     */
    static subscribe(bucketArn: Input<string>, subscriber: Input<string | FunctionArgs | FunctionArn>, args?: BucketSubscriberArgs): Output<BucketLambdaSubscriber>;
    private static _subscribeFunction;
    /**
     * Subscribe to events from this bucket with an SQS Queue.
     *
     * @deprecated The `notify` function is now the recommended way to subscribe to events
     * from this bucket. It allows you to configure multiple subscribers at once. To migrate,
     * remove the current subscriber, deploy the changes, and then add the subscriber
     * back using the new `notify` function.
     *
     * @param queueArn The ARN of the queue that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have a queue.
     *
     * ```js title="sst.config.ts"
     * const queue = new sst.aws.Queue("MyQueue");
     * ```
     *
     * You can subscribe to this bucket with it.
     *
     * ```js title="sst.config.ts"
     * bucket.subscribe(queue.arn);
     * ```
     *
     * Subscribe to specific S3 events.
     *
     * ```js title="sst.config.ts"
     * bucket.subscribe(queue.arn, {
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     *
     * Subscribe to specific S3 events from a specific folder.
     *
     * ```js title="sst.config.ts" {2}
     * bucket.subscribe(queue.arn, {
     *   filterPrefix: "images/",
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     */
    subscribeQueue(queueArn: Input<string>, args?: BucketSubscriberArgs): Output<BucketQueueSubscriber>;
    /**
     * Subscribe to events of an S3 bucket that was not created in your app with an SQS Queue.
     *
     * @deprecated The `notify` function is now the recommended way to subscribe to events
     * from this bucket. It allows you to configure multiple subscribers at once. To migrate,
     * remove the current subscriber, deploy the changes, and then add the subscriber
     * back using the new `notify` function.
     *
     * @param bucketArn The ARN of the S3 bucket to subscribe to.
     * @param queueArn The ARN of the queue that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have an existing S3 bucket and SQS queue with the following ARNs.
     *
     * ```js title="sst.config.ts"
     * const bucketArn = "arn:aws:s3:::my-bucket";
     * const queueArn = "arn:aws:sqs:us-east-1:123456789012:MyQueue";
     * ```
     *
     * You can subscribe to the bucket with the queue.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Bucket.subscribeQueue(bucketArn, queueArn);
     * ```
     *
     * Subscribe to specific S3 events.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Bucket.subscribeQueue(bucketArn, queueArn, {
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     *
     * Subscribe to specific S3 events from a specific folder.
     *
     * ```js title="sst.config.ts" {2}
     * sst.aws.Bucket.subscribeQueue(bucketArn, queueArn, {
     *   filterPrefix: "images/",
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     */
    static subscribeQueue(bucketArn: Input<string>, queueArn: Input<string>, args?: BucketSubscriberArgs): Output<BucketQueueSubscriber>;
    private static _subscribeQueue;
    /**
     * Subscribe to events from this bucket with an SNS Topic.
     *
     * @deprecated The `notify` function is now the recommended way to subscribe to events
     * from this bucket. It allows you to configure multiple subscribers at once. To migrate,
     * remove the current subscriber, deploy the changes, and then add the subscriber
     * back using the new `notify` function.
     *
     * @param topicArn The ARN of the topic that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have a topic.
     *
     * ```js title="sst.config.ts"
     * const topic = new sst.aws.SnsTopic("MyTopic");
     * ```
     *
     * You can subscribe to this bucket with it.
     *
     * ```js title="sst.config.ts"
     * bucket.subscribe(topic.arn);
     * ```
     *
     * Subscribe to specific S3 events.
     *
     * ```js title="sst.config.ts"
     * bucket.subscribe(topic.arn, {
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     *
     * Subscribe to specific S3 events from a specific folder.
     *
     * ```js title="sst.config.ts" {2}
     * bucket.subscribe(topic.arn, {
     *   filterPrefix: "images/",
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     */
    subscribeTopic(topicArn: Input<string>, args?: BucketSubscriberArgs): Output<BucketTopicSubscriber>;
    /**
     * Subscribe to events of an S3 bucket that was not created in your app with an SNS Topic.
     *
     * @deprecated The `notify` function is now the recommended way to subscribe to events
     * from this bucket. It allows you to configure multiple subscribers at once. To migrate,
     * remove the current subscriber, deploy the changes, and then add the subscriber
     * back using the new `notify` function.
     *
     * @param bucketArn The ARN of the S3 bucket to subscribe to.
     * @param topicArn The ARN of the topic that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have an existing S3 bucket and SNS topic with the following ARNs.
     *
     * ```js title="sst.config.ts"
     * const bucketArn = "arn:aws:s3:::my-bucket";
     * const topicArn = "arn:aws:sns:us-east-1:123456789012:MyTopic";
     * ```
     *
     * You can subscribe to the bucket with the topic.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Bucket.subscribe(bucketArn, topicArn);
     * ```
     *
     * Subscribe to specific S3 events.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Bucket.subscribe(bucketArn, topicArn, {
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     *
     * Subscribe to specific S3 events from a specific folder.
     *
     * ```js title="sst.config.ts" {2}
     * sst.aws.Bucket.subscribe(bucketArn, topicArn, {
     *   filterPrefix: "images/",
     *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
     * });
     * ```
     */
    static subscribeTopic(bucketArn: Input<string>, topicArn: Input<string>, args?: BucketSubscriberArgs): Output<BucketTopicSubscriber>;
    private static _subscribeTopic;
    private static buildSubscriberId;
    private ensureNotSubscribed;
    /** @internal */
    getSSTLink(): {
        properties: {
            name: Output<string>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
}
export {};
