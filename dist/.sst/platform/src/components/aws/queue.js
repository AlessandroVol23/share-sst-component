import { output, jsonStringify, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { VisibleError } from "../error";
import { hashStringToPrettyString, logicalName } from "../naming";
import { parseQueueArn } from "./helpers/arn";
import { QueueLambdaSubscriber } from "./queue-lambda-subscriber";
import { iam, sqs } from "@pulumi/aws";
import { toSeconds } from "../duration";
import { permission } from "./permission.js";
/**
 * The `Queue` component lets you add a serverless queue to your app. It uses [Amazon SQS](https://aws.amazon.com/sqs/).
 *
 * @example
 *
 * #### Create a queue
 *
 * ```ts title="sst.config.ts"
 * const queue = new sst.aws.Queue("MyQueue");
 * ```
 *
 * #### Make it a FIFO queue
 *
 * You can optionally make it a FIFO queue.
 *
 * ```ts {2} title="sst.config.ts"
 * new sst.aws.Queue("MyQueue", {
 *   fifo: true
 * });
 * ```
 *
 * #### Add a subscriber
 *
 * ```ts title="sst.config.ts"
 * queue.subscribe("src/subscriber.handler");
 * ```
 *
 * #### Link the queue to a resource
 *
 * You can link the queue to other resources, like a function or your Next.js app.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [queue]
 * });
 * ```
 *
 * Once linked, you can send messages to the queue from your function code.
 *
 * ```ts title="app/page.tsx" {1,7}
 * import { Resource } from "sst";
 * import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
 *
 * const sqs = new SQSClient({});
 *
 * await sqs.send(new SendMessageCommand({
 *   QueueUrl: Resource.MyQueue.url,
 *   MessageBody: "Hello from Next.js!"
 * }));
 * ```
 */
export class Queue extends Component {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
        this.isSubscribed = false;
        const self = this;
        this.constructorName = name;
        this.constructorOpts = opts;
        if (args && "ref" in args) {
            const ref = reference();
            this.queue = ref.queue;
            return;
        }
        const fifo = normalizeFifo();
        const dlq = normalizeDlq();
        const visibilityTimeout = output(args?.visibilityTimeout ?? "30 seconds");
        const delay = output(args?.delay ?? "0 seconds");
        this.queue = createQueue();
        function reference() {
            const ref = args;
            const queue = sqs.Queue.get(`${name}Queue`, ref.queueUrl, undefined, {
                parent: self,
            });
            return { queue };
        }
        function normalizeFifo() {
            return output(args?.fifo).apply((v) => {
                if (!v)
                    return false;
                if (v === true)
                    return {
                        contentBasedDeduplication: false,
                    };
                return {
                    contentBasedDeduplication: v.contentBasedDeduplication ?? false,
                };
            });
        }
        function normalizeDlq() {
            if (args?.dlq === undefined)
                return;
            return output(args?.dlq).apply((v) => typeof v === "string" ? { queue: v, retry: 3 } : v);
        }
        function createQueue() {
            return new sqs.Queue(...transform(args?.transform?.queue, `${name}Queue`, {
                fifoQueue: fifo.apply((v) => v !== false),
                contentBasedDeduplication: fifo.apply((v) => v === false ? false : v.contentBasedDeduplication),
                visibilityTimeoutSeconds: visibilityTimeout.apply((v) => toSeconds(v)),
                delaySeconds: delay.apply((v) => toSeconds(v)),
                redrivePolicy: dlq &&
                    jsonStringify({
                        deadLetterTargetArn: dlq.queue,
                        maxReceiveCount: dlq.retry,
                    }),
            }, { parent: self }));
        }
    }
    /**
     * The ARN of the SQS Queue.
     */
    get arn() {
        return this.queue.arn;
    }
    /**
     * The SQS Queue URL.
     */
    get url() {
        return this.queue.url;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon SQS Queue.
             */
            queue: this.queue,
        };
    }
    /**
     * Subscribe to this queue.
     *
     * @param subscriber The function that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * ```js title="sst.config.ts"
     * queue.subscribe("src/subscriber.handler");
     * ```
     *
     * Add a filter to the subscription.
     *
     * ```js title="sst.config.ts"
     * queue.subscribe("src/subscriber.handler", {
     *   filters: [
     *     {
     *       body: {
     *         RequestCode: ["BBBB"]
     *       }
     *     }
     *   ]
     * });
     * ```
     *
     * Customize the subscriber function.
     *
     * ```js title="sst.config.ts"
     * queue.subscribe({
     *   handler: "src/subscriber.handler",
     *   timeout: "60 seconds"
     * });
     * ```
     *
     * Or pass in the ARN of an existing Lambda function.
     *
     * ```js title="sst.config.ts"
     * queue.subscribe("arn:aws:lambda:us-east-1:123456789012:function:my-function");
     * ```
     */
    subscribe(subscriber, args, opts) {
        if (this.isSubscribed)
            throw new VisibleError(`Cannot subscribe to the "${this.constructorName}" queue multiple times. An SQS Queue can only have one subscriber.`);
        this.isSubscribed = true;
        return Queue._subscribeFunction(this.constructorName, this.arn, subscriber, args, { ...opts, provider: this.constructorOpts.provider });
    }
    /**
     * Subscribe to an SQS Queue that was not created in your app.
     *
     * @param queueArn The ARN of the SQS Queue to subscribe to.
     * @param subscriber The function that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have an existing SQS Queue with the following ARN.
     *
     * ```js title="sst.config.ts"
     * const queueArn = "arn:aws:sqs:us-east-1:123456789012:MyQueue";
     * ```
     *
     * You can subscribe to it by passing in the ARN.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Queue.subscribe(queueArn, "src/subscriber.handler");
     * ```
     *
     * Add a filter to the subscription.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Queue.subscribe(queueArn, "src/subscriber.handler", {
     *   filters: [
     *     {
     *       body: {
     *         RequestCode: ["BBBB"]
     *       }
     *     }
     *   ]
     * });
     * ```
     *
     * Customize the subscriber function.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Queue.subscribe(queueArn, {
     *   handler: "src/subscriber.handler",
     *   timeout: "60 seconds"
     * });
     * ```
     */
    static subscribe(queueArn, subscriber, args, opts) {
        return output(queueArn).apply((queueArn) => this._subscribeFunction(logicalName(parseQueueArn(queueArn).queueName), queueArn, subscriber, args, opts));
    }
    static _subscribeFunction(name, queueArn, subscriber, args = {}, opts) {
        return output(queueArn).apply((queueArn) => {
            const suffix = logicalName(hashStringToPrettyString(queueArn, 6));
            return new QueueLambdaSubscriber(`${name}Subscriber${suffix}`, {
                queue: { arn: queueArn },
                subscriber,
                ...args,
            }, opts);
        });
    }
    /**
     * Reference an existing SQS Queue with its queue URL. This is useful when you create a
     * queue in one stage and want to share it in another stage. It avoids having to create
     * a new queue in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share SQS queues across stages.
     * :::
     *
     * @param name The name of the component.
     * @param queueUrl The URL of the existing SQS Queue.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a queue in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new queue, you want to share the queue from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const queue = $app.stage === "frank"
     *   ? sst.aws.Queue.get("MyQueue", "https://sqs.us-east-1.amazonaws.com/123456789012/MyQueue")
     *   : new sst.aws.Queue("MyQueue");
     * ```
     *
     * Here `https://sqs.us-east-1.amazonaws.com/123456789012/MyQueue` is the URL of the queue
     * created in the `dev` stage. You can find this by outputting the queue URL in the `dev`
     * stage.
     *
     * ```ts title="sst.config.ts"
     * return queue.url;
     * ```
     */
    static get(name, queueUrl, opts) {
        return new Queue(name, {
            ref: true,
            queueUrl,
        }, opts);
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                url: this.url,
            },
            include: [
                permission({
                    actions: ["sqs:*"],
                    resources: [this.arn],
                }),
            ],
        };
    }
    /** @internal */
    static createPolicy(name, arn, opts) {
        return new sqs.QueuePolicy(name, {
            queueUrl: arn.apply((arn) => parseQueueArn(arn).queueUrl),
            policy: iam.getPolicyDocumentOutput({
                statements: [
                    {
                        actions: ["sqs:SendMessage"],
                        resources: [arn],
                        principals: [
                            {
                                type: "Service",
                                identifiers: [
                                    "sns.amazonaws.com",
                                    "s3.amazonaws.com",
                                    "events.amazonaws.com",
                                ],
                            },
                        ],
                    },
                ],
            }).json,
        }, {
            retainOnDelete: true,
            ...opts,
        });
    }
}
const __pulumiType = "sst:aws:Queue";
// @ts-expect-error
Queue.__pulumiType = __pulumiType;
