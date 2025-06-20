import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { FunctionArgs, FunctionArn } from "./function";
import { QueueLambdaSubscriber } from "./queue-lambda-subscriber";
import { lambda, sqs } from "@pulumi/aws";
import { DurationHours, DurationMinutes } from "../duration";
export interface QueueArgs {
    /**
     * FIFO or _first-in-first-out_ queues are designed to guarantee that messages are processed exactly once and in the order that they are sent.
     *
     * :::caution
     * Changing a standard queue to a FIFO queue (or the other way around) will cause the queue to be destroyed and recreated.
     * :::
     *
     * @default `false`
     * @example
     * ```js
     * {
     *   fifo: true
     * }
     * ```
     *
     * By default, content based deduplication is disabled. You can enable it by configuring
     * the `fifo` property.
     *
     * ```js
     * {
     *   fifo: {
     *     contentBasedDeduplication: true
     *   }
     * }
     * ```
     */
    fifo?: Input<boolean | {
        /**
         * Content-based deduplication automatically generates a deduplication ID by hashing
         * the message body to prevent duplicate message delivery.
         *
         * @default `false`
         */
        contentBasedDeduplication?: Input<boolean>;
    }>;
    /**
     * The period of time which the delivery of all messages in the queue is delayed.
     *
     * This can range from 0 seconds to 900 seconds (15 minutes).
     *
     * @default `"0 seconds"`
     * @example
     * ```js
     * {
     *   delay: "10 seconds"
     * }
     * ```
     */
    delay?: Input<DurationMinutes>;
    /**
     * Visibility timeout is a period of time during which a message is temporarily
     * invisible to other consumers after a consumer has retrieved it from the queue.
     * This mechanism prevents other consumers from processing the same message
     * concurrently, ensuring that each message is processed only once.
     *
     * This timeout can range from 0 seconds to 12 hours.
     *
     * @default `"30 seconds"`
     * @example
     * ```js
     * {
     *   visibilityTimeout: "1 hour"
     * }
     * ```
     */
    visibilityTimeout?: Input<DurationHours>;
    /**
     * Optionally add a dead-letter queue or DLQ for this queue.
     *
     * A dead-letter queue is used to store messages that can't be processed successfully by the
     * subscriber function after the `retry` limit is reached.
     *
     * This takes either the ARN of the dead-letter queue or an object to configure how the
     * dead-letter queue is used.
     *
     * @example
     * For example, here's how you can create a dead-letter queue and link it to the main queue.
     *
     * ```ts title="sst.config.ts" {4}
     * const deadLetterQueue = new sst.aws.Queue("MyDLQ");
     *
     * new sst.aws.Queue("MyQueue", {
     *   dlq: deadLetterQueue.arn,
     * });
     * ```
     *
     * By default, the main queue will retry processing the message 3 times before sending it to the dead-letter queue. You can customize this.
     *
     * ```ts title="sst.config.ts" {3}
     * new sst.aws.Queue("MyQueue", {
     *   dlq: {
     *     retry: 5,
     *     queue: deadLetterQueue.arn,
     *   }
     * });
     * ```
     */
    dlq?: Input<string | {
        /**
         * The ARN of the dead-letter queue.
         */
        queue: Input<string>;
        /**
         * The number of times the main queue will retry the message before sending it to the dead-letter queue.
         * @default `3`
         */
        retry: Input<number>;
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the SQS Queue resource.
         */
        queue?: Transform<sqs.QueueArgs>;
    };
}
export interface QueueSubscriberArgs {
    /**
     * Filter the records that'll be processed by the `subscriber` function.
     *
     * :::tip
     * You can pass in up to 5 different filters.
     * :::
     *
     * You can pass in up to 5 different filter policies. These will logically ORed together. Meaning that if any single policy matches, the record will be processed. Learn more about the [filter rule syntax](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html#filtering-syntax).
     *
     * @example
     * For example, if you Queue contains records in this JSON format.
     * ```js
     * {
     *   RecordNumber: 0000,
     *   RequestCode: "AAAA",
     *   TimeStamp: "yyyy-mm-ddThh:mm:ss"
     * }
     * ```
     *
     * To process only those records where the `RequestCode` is `BBBB`.
  
     * ```js
     * {
     *   filters: [
     *     {
     *       body: {
     *         RequestCode: ["BBBB"]
     *       }
     *     }
     *   ]
     * }
     * ```
     *
     * And to process only those records where `RecordNumber` greater than `9999`.
     *
     * ```js
     * {
     *   filters: [
     *     {
     *       body: {
     *         RecordNumber: [{ numeric: [ ">", 9999 ] }]
     *       }
     *     }
     *   ]
     * }
     * ```
     */
    filters?: Input<Input<Record<string, any>>[]>;
    /**
     * Configure batch processing options for the consumer function.
     * @default `{size: 10, window: "20 seconds", partialResponses: false}`
     */
    batch?: Input<{
        /**
         * The maximum number of events that will be processed together in a single invocation
         * of the consumer function.
         *
         * Value must be between 1 and 10000.
         *
         * :::note
         * When `size` is set to a value greater than 10, `window` must be set to at least `1 second`.
         * :::
         *
         * @default `10`
         * @example
         * Set batch size to 1. This will process events individually.
         * ```js
         * {
         *   batch: {
         *     size: 1
         *   }
         * }
         * ```
         */
        size?: Input<number>;
        /**
         * The maximum amount of time to wait for collecting events before sending the batch to
         * the consumer function, even if the batch size hasn't been reached.
         *
         * Value must be between 0 seconds and 5 minutes (300 seconds).
         * @default `"0 seconds"`
         * @example
         * ```js
         * {
         *   batch: {
         *     window: "20 seconds"
         *   }
         * }
         * ```
         */
        window?: Input<DurationMinutes>;
        /**
         * Whether to return partial successful responses for a batch.
         *
         * Enables reporting of individual message failures in a batch. When enabled, only failed
         * messages become visible in the queue again, preventing unnecessary reprocessing of
         * successful messages.
         *
         * The handler function must return a response with failed message IDs.
         *
         * :::note
         * Ensure your Lambda function is updated to handle `batchItemFailures` responses when
         * enabling this option.
         * :::
         *
         * Read more about [partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html#services-sqs-batchfailurereporting).
         * @default `false`
         * @example
         * Enable partial responses.
         * ```js
         * {
         *   batch: {
         *     partialResponses: true
         *   }
         * }
         * ```
         *
         * For a batch of messages (id1, id2, id3, id4, id5), if id2 and id4 fail:
         * ```json
         * {
         *   "batchItemFailures": [
         *         {
         *             "itemIdentifier": "id2"
         *         },
         *         {
         *             "itemIdentifier": "id4"
         *         }
         *     ]
         * }
         * ```
         *
         * This makes only id2 and id4 visible again in the queue.
         */
        partialResponses?: Input<boolean>;
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Lambda Event Source Mapping resource.
         */
        eventSourceMapping?: Transform<lambda.EventSourceMappingArgs>;
    };
}
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
export declare class Queue extends Component implements Link.Linkable {
    private constructorName;
    private constructorOpts;
    private queue;
    private isSubscribed;
    constructor(name: string, args?: QueueArgs, opts?: ComponentResourceOptions);
    /**
     * The ARN of the SQS Queue.
     */
    get arn(): Output<string>;
    /**
     * The SQS Queue URL.
     */
    get url(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon SQS Queue.
         */
        queue: import("@pulumi/aws/sqs/queue").Queue;
    };
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
    subscribe(subscriber: Input<string | FunctionArgs | FunctionArn>, args?: QueueSubscriberArgs, opts?: ComponentResourceOptions): Output<QueueLambdaSubscriber>;
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
    static subscribe(queueArn: Input<string>, subscriber: Input<string | FunctionArgs | FunctionArn>, args?: QueueSubscriberArgs, opts?: ComponentResourceOptions): Output<QueueLambdaSubscriber>;
    private static _subscribeFunction;
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
    static get(name: string, queueUrl: Input<string>, opts?: ComponentResourceOptions): Queue;
    /** @internal */
    getSSTLink(): {
        properties: {
            url: Output<string>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
    /** @internal */
    static createPolicy(name: string, arn: Output<string>, opts?: ComponentResourceOptions): import("@pulumi/aws/sqs/queuePolicy").QueuePolicy;
}
