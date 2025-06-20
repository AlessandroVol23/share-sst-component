import { output, interpolate, all, } from "@pulumi/pulumi";
import { hashStringToPrettyString, logicalName } from "../naming";
import { Component, transform } from "../component";
import { toSeconds } from "../duration";
import { VisibleError } from "../error";
import { parseBucketArn } from "./helpers/arn";
import { BucketLambdaSubscriber } from "./bucket-lambda-subscriber";
import { iam, s3 } from "@pulumi/aws";
import { permission } from "./permission";
import { BucketQueueSubscriber } from "./bucket-queue-subscriber";
import { BucketTopicSubscriber } from "./bucket-topic-subscriber";
import { BucketNotification } from "./bucket-notification";
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
export class Bucket extends Component {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
        this.isSubscribed = false;
        this.constructorName = name;
        this.constructorOpts = opts;
        if (args && "ref" in args) {
            const ref = args;
            this.bucket = output(ref.bucket);
            return;
        }
        const parent = this;
        const access = normalizeAccess();
        const enforceHttps = output(args.enforceHttps ?? true);
        const policyArgs = normalizePolicy();
        const bucket = createBucket();
        createVersioning();
        const publicAccessBlock = createPublicAccess();
        const policy = createBucketPolicy();
        createCorsRule();
        // Ensure the policy is created when the bucket is used in another component
        // (ie. bucket.name). Also, a bucket can only have one policy. We want to ensure
        // the policy created here is created first. And SST will throw an error if
        // another policy is created after this one.
        this.bucket = policy.urn.apply(() => bucket);
        function normalizeAccess() {
            return all([args.public, args.access]).apply(([pub, access]) => pub === true ? "public" : access);
        }
        function normalizePolicy() {
            return output(args.policy ?? []).apply((policy) => policy.map((p) => ({
                ...p,
                effect: p.effect && p.effect.charAt(0).toUpperCase() + p.effect.slice(1),
                principals: p.principals === "*"
                    ? [{ type: "*", identifiers: ["*"] }]
                    : p.principals.map((i) => ({
                        ...i,
                        type: {
                            aws: "AWS",
                            service: "Service",
                            federated: "Federated",
                            canonical: "Canonical",
                        }[i.type],
                    })),
                paths: p.paths
                    ? p.paths.map((path) => path.replace(/^\//, ""))
                    : ["", "*"],
            })));
        }
        function createBucket() {
            return new s3.BucketV2(...transform(args.transform?.bucket, `${name}Bucket`, {
                forceDestroy: true,
            }, { parent }));
        }
        function createVersioning() {
            return output(args.versioning).apply((versioning) => {
                if (!versioning)
                    return;
                return new s3.BucketVersioningV2(...transform(args.transform?.versioning, `${name}Versioning`, {
                    bucket: bucket.bucket,
                    versioningConfiguration: {
                        status: "Enabled",
                    },
                }, { parent }));
            });
        }
        function createPublicAccess() {
            if (args.transform?.publicAccessBlock === false)
                return;
            return new s3.BucketPublicAccessBlock(...transform(args.transform?.publicAccessBlock, `${name}PublicAccessBlock`, {
                bucket: bucket.bucket,
                blockPublicAcls: true,
                blockPublicPolicy: access.apply((v) => v !== "public"),
                ignorePublicAcls: true,
                restrictPublicBuckets: access.apply((v) => v !== "public"),
            }, { parent }));
        }
        function createBucketPolicy() {
            return all([access, enforceHttps, policyArgs]).apply(([access, enforceHttps, policyArgs]) => {
                const statements = [];
                if (access) {
                    statements.push({
                        principals: [
                            access === "public"
                                ? { type: "*", identifiers: ["*"] }
                                : {
                                    type: "Service",
                                    identifiers: ["cloudfront.amazonaws.com"],
                                },
                        ],
                        actions: ["s3:GetObject"],
                        resources: [interpolate `${bucket.arn}/*`],
                    });
                }
                if (enforceHttps) {
                    statements.push({
                        effect: "Deny",
                        principals: [{ type: "*", identifiers: ["*"] }],
                        actions: ["s3:*"],
                        resources: [bucket.arn, interpolate `${bucket.arn}/*`],
                        conditions: [
                            {
                                test: "Bool",
                                variable: "aws:SecureTransport",
                                values: ["false"],
                            },
                        ],
                    });
                }
                statements.push(...policyArgs.map((policy) => ({
                    effect: policy.effect,
                    principals: policy.principals,
                    actions: policy.actions,
                    conditions: policy.conditions,
                    resources: policy.paths.map((path) => path === "" ? bucket.arn : interpolate `${bucket.arn}/${path}`),
                })));
                return new s3.BucketPolicy(...transform(args.transform?.policy, `${name}Policy`, {
                    bucket: bucket.bucket,
                    policy: iam.getPolicyDocumentOutput({ statements }).json,
                }, {
                    parent,
                    dependsOn: publicAccessBlock,
                }));
            });
        }
        function createCorsRule() {
            return output(args.cors).apply((cors) => {
                if (cors === false)
                    return;
                return new s3.BucketCorsConfigurationV2(...transform(args.transform?.cors, `${name}Cors`, {
                    bucket: bucket.bucket,
                    corsRules: [
                        {
                            allowedHeaders: cors?.allowHeaders ?? ["*"],
                            allowedMethods: cors?.allowMethods ?? [
                                "DELETE",
                                "GET",
                                "HEAD",
                                "POST",
                                "PUT",
                            ],
                            allowedOrigins: cors?.allowOrigins ?? ["*"],
                            exposeHeaders: cors?.exposeHeaders,
                            maxAgeSeconds: toSeconds(cors?.maxAge ?? "0 seconds"),
                        },
                    ],
                }, { parent }));
            });
        }
    }
    /**
     * The generated name of the S3 Bucket.
     */
    get name() {
        return this.bucket.bucket;
    }
    /**
     * The domain name of the bucket. Has the format `${bucketName}.s3.amazonaws.com`.
     */
    get domain() {
        return this.bucket.bucketDomainName;
    }
    /**
     * The ARN of the S3 Bucket.
     */
    get arn() {
        return this.bucket.arn;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon S3 bucket.
             */
            bucket: this.bucket,
        };
    }
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
    static get(name, bucketName, opts) {
        return new Bucket(name, {
            ref: true,
            bucket: s3.BucketV2.get(`${name}Bucket`, bucketName, undefined, opts),
        });
    }
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
    notify(args) {
        if (this.isSubscribed) {
            throw new VisibleError(`Cannot call "notify" on the "${this.constructorName}" bucket multiple times. Calling it again will override previous notifications.`);
        }
        this.isSubscribed = true;
        const name = this.constructorName;
        const opts = this.constructorOpts;
        return new BucketNotification(`${name}Notifications`, {
            bucket: { name: this.bucket.bucket, arn: this.bucket.arn },
            ...args,
        }, opts);
    }
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
    subscribe(subscriber, args) {
        this.ensureNotSubscribed();
        return Bucket._subscribeFunction(this.constructorName, this.bucket.bucket, this.bucket.arn, subscriber, args, { provider: this.constructorOpts.provider });
    }
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
    static subscribe(bucketArn, subscriber, args) {
        return output(bucketArn).apply((bucketArn) => {
            const bucketName = parseBucketArn(bucketArn).bucketName;
            return this._subscribeFunction(bucketName, bucketName, bucketArn, subscriber, args);
        });
    }
    static _subscribeFunction(name, bucketName, bucketArn, subscriber, args = {}, opts = {}) {
        return all([bucketArn, subscriber, args]).apply(([bucketArn, subscriber, args]) => {
            const subscriberId = this.buildSubscriberId(bucketArn, typeof subscriber === "string" ? subscriber : subscriber.handler);
            return new BucketLambdaSubscriber(`${name}Subscriber${subscriberId}`, {
                bucket: { name: bucketName, arn: bucketArn },
                subscriber,
                subscriberId,
                ...args,
            }, opts);
        });
    }
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
    subscribeQueue(queueArn, args = {}) {
        this.ensureNotSubscribed();
        return Bucket._subscribeQueue(this.constructorName, this.bucket.bucket, this.arn, queueArn, args, { provider: this.constructorOpts.provider });
    }
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
    static subscribeQueue(bucketArn, queueArn, args) {
        return output(bucketArn).apply((bucketArn) => {
            const bucketName = parseBucketArn(bucketArn).bucketName;
            return this._subscribeQueue(bucketName, bucketName, bucketArn, queueArn, args);
        });
    }
    static _subscribeQueue(name, bucketName, bucketArn, queueArn, args = {}, opts = {}) {
        return all([bucketArn, queueArn, args]).apply(([bucketArn, queueArn, args]) => {
            const subscriberId = this.buildSubscriberId(bucketArn, queueArn);
            return new BucketQueueSubscriber(`${name}Subscriber${subscriberId}`, {
                bucket: { name: bucketName, arn: bucketArn },
                queue: queueArn,
                subscriberId,
                ...args,
            }, opts);
        });
    }
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
    subscribeTopic(topicArn, args = {}) {
        this.ensureNotSubscribed();
        return Bucket._subscribeTopic(this.constructorName, this.bucket.bucket, this.arn, topicArn, args, { provider: this.constructorOpts.provider });
    }
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
    static subscribeTopic(bucketArn, topicArn, args) {
        return output(bucketArn).apply((bucketArn) => {
            const bucketName = parseBucketArn(bucketArn).bucketName;
            return this._subscribeTopic(bucketName, bucketName, bucketArn, topicArn, args);
        });
    }
    static _subscribeTopic(name, bucketName, bucketArn, topicArn, args = {}, opts = {}) {
        return all([bucketArn, topicArn, args]).apply(([bucketArn, topicArn, args]) => {
            const subscriberId = this.buildSubscriberId(bucketArn, topicArn);
            return new BucketTopicSubscriber(`${name}Subscriber${subscriberId}`, {
                bucket: { name: bucketName, arn: bucketArn },
                topic: topicArn,
                subscriberId,
                ...args,
            }, opts);
        });
    }
    static buildSubscriberId(bucketArn, _discriminator) {
        return logicalName(hashStringToPrettyString([
            bucketArn,
            // Temporarily only allowing one subscriber per bucket because of the
            // AWS/Terraform issue that appending/removing a notification deletes
            // all existing notifications.
            //
            // A solution would be to implement a dynamic provider. On create,
            // get existing notifications then append. And on delete, get existing
            // notifications then remove from the list.
            //
            // https://github.com/hashicorp/terraform-provider-aws/issues/501
            //
            // Commenting out the lines below to ensure the id never changes.
            // Because on id change, the removal of notification happens after
            // the creation of notification. And the newly created notification
            // gets removed.
            //...events,
            //args.filterPrefix ?? "",
            //args.filterSuffix ?? "",
            //discriminator,
        ].join(""), 6));
    }
    ensureNotSubscribed() {
        if (this.isSubscribed)
            throw new VisibleError(`Cannot subscribe to the "${this.constructorName}" bucket multiple times. An S3 bucket can only have one subscriber.`);
        this.isSubscribed = true;
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                name: this.name,
            },
            include: [
                permission({
                    actions: ["s3:*"],
                    resources: [this.arn, interpolate `${this.arn}/*`],
                }),
            ],
        };
    }
}
const __pulumiType = "sst:aws:Bucket";
// @ts-expect-error
Bucket.__pulumiType = __pulumiType;
