import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { FunctionArgs, FunctionArn } from "./function";
import { SnsTopicLambdaSubscriber } from "./sns-topic-lambda-subscriber";
import { SnsTopicQueueSubscriber } from "./sns-topic-queue-subscriber";
import { sns } from "@pulumi/aws";
import { Queue } from "./queue";
export interface SnsTopicArgs {
    /**
     * FIFO (First-In-First-Out) topics are designed to provide strict message ordering.
     *
     * :::caution
     * Changing a standard topic to a FIFO topic or the other way around will result in the destruction and recreation of the topic.
     * :::
     *
     * @default `false`
     * @example
     * ```js
     * {
     *   fifo: true
     * }
     * ```
     */
    fifo?: Input<boolean>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the SNS Topic resource.
         */
        topic?: Transform<sns.TopicArgs>;
    };
}
export interface SnsTopicSubscriberArgs {
    /**
     * Filter the messages that'll be processed by the subscriber.
     *
     * If any single property in the filter doesn't match
     * an attribute assigned to the message, then the policy rejects the message.
     *
     * :::tip
     * Learn more about [subscription filter policies](https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html).
     * :::
     *
     * @example
     * For example, if your SNS Topic message contains this in a JSON format.
     * ```js
     * {
     *   store: "example_corp",
     *   event: "order-placed",
     *   customer_interests: [
     *      "soccer",
     *      "rugby",
     *      "hockey"
     *   ],
     *   price_usd: 210.75
     * }
     * ```
     *
     * Then this filter policy accepts the message.
     *
     * ```js
     * {
     *   filter: {
     *     store: ["example_corp"],
     *     event: [{"anything-but": "order_cancelled"}],
     *     customer_interests: [
     *        "rugby",
     *        "football",
     *        "baseball"
     *     ],
     *     price_usd: [{numeric: [">=", 100]}]
     *   }
     * }
     * ```
     */
    filter?: Input<Record<string, any>>;
    /**
     * [Transform](/docs/components#transform) how this subscription creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the SNS Topic Subscription resource.
         */
        subscription?: Transform<sns.TopicSubscriptionArgs>;
    };
}
/**
 * The `SnsTopic` component lets you add an [Amazon SNS Topic](https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html) to your app.
 *
 * :::note
 * The difference between an `SnsTopic` and a `Queue` is that with a topic you can deliver messages to multiple subscribers.
 * :::
 *
 * @example
 *
 * #### Create a topic
 *
 * ```ts title="sst.config.ts"
 * const topic = new sst.aws.SnsTopic("MyTopic");
 * ```
 *
 * #### Make it a FIFO topic
 *
 * You can optionally make it a FIFO topic.
 *
 * ```ts {2} title="sst.config.ts"
 * new sst.aws.SnsTopic("MyTopic", {
 *   fifo: true
 * });
 * ```
 *
 * #### Add a subscriber
 *
 * ```ts title="sst.config.ts"
 * topic.subscribe("MySubscriber", "src/subscriber.handler");
 * ```
 *
 * #### Link the topic to a resource
 *
 * You can link the topic to other resources, like a function or your Next.js app.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [topic]
 * });
 * ```
 *
 * Once linked, you can publish messages to the topic from your function code.
 *
 * ```ts title="app/page.tsx" {1,7}
 * import { Resource } from "sst";
 * import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
 *
 * const sns = new SNSClient({});
 *
 * await sns.send(new PublishCommand({
 *   TopicArn: Resource.MyTopic.arn,
 *   Message: "Hello from Next.js!"
 * }));
 * ```
 */
export declare class SnsTopic extends Component implements Link.Linkable {
    private constructorName;
    private constructorOpts;
    private topic;
    constructor(name: string, args?: SnsTopicArgs, opts?: ComponentResourceOptions);
    /**
     * The ARN of the SNS Topic.
     */
    get arn(): Output<string>;
    /**
     * The name of the SNS Topic.
     */
    get name(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon SNS Topic.
         */
        topic: import("@pulumi/aws/sns/topic").Topic;
    };
    /**
     * Subscribe to this SNS Topic.
     *
     * @param name The name of the subscriber.
     * @param subscriber The function that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * ```js title="sst.config.ts"
     * topic.subscribe("MySubscriber", "src/subscriber.handler");
     * ```
     *
     * Add a filter to the subscription.
     *
     * ```js title="sst.config.ts"
     * topic.subscribe("MySubscriber", "src/subscriber.handler", {
     *   filter: {
     *     price_usd: [{numeric: [">=", 100]}]
     *   }
     * });
     * ```
     *
     * Customize the subscriber function.
     *
     * ```js title="sst.config.ts"
     * topic.subscribe("MySubscriber", {
     *   handler: "src/subscriber.handler",
     *   timeout: "60 seconds"
     * });
     * ```
     *
     * Or pass in the ARN of an existing Lambda function.
     *
     * ```js title="sst.config.ts"
     * topic.subscribe("MySubscriber", "arn:aws:lambda:us-east-1:123456789012:function:my-function");
     * ```
     */
    subscribe(name: string, subscriber: Input<string | FunctionArgs | FunctionArn>, args?: SnsTopicSubscriberArgs): Output<SnsTopicLambdaSubscriber>;
    /**
     * @deprecated The subscribe function now requires a `name` parameter as the first argument.
     * To migrate, remove the current subscriber, deploy the changes, and then add the subscriber
     * back with the new `name` argument.
     */
    subscribe(subscriber: Input<string | FunctionArgs | FunctionArn>, args?: SnsTopicSubscriberArgs): Output<SnsTopicLambdaSubscriber>;
    /**
     * Subscribe to an SNS Topic that was not created in your app.
     *
     * @param name The name of the subscriber.
     * @param topicArn The ARN of the SNS Topic to subscribe to.
     * @param subscriber The function that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have an existing SNS Topic with the following ARN.
     *
     * ```js title="sst.config.ts"
     * const topicArn = "arn:aws:sns:us-east-1:123456789012:MyTopic";
     * ```
     *
     * You can subscribe to it by passing in the ARN.
     *
     * ```js title="sst.config.ts"
     * sst.aws.SnsTopic.subscribe("MySubscriber", topicArn, "src/subscriber.handler");
     * ```
     *
     * Add a filter to the subscription.
     *
     * ```js title="sst.config.ts"
     * sst.aws.SnsTopic.subscribe("MySubscriber", topicArn, "src/subscriber.handler", {
     *   filter: {
     *     price_usd: [{numeric: [">=", 100]}]
     *   }
     * });
     * ```
     *
     * Customize the subscriber function.
     *
     * ```js title="sst.config.ts"
     * sst.aws.SnsTopic.subscribe("MySubscriber", topicArn, {
     *   handler: "src/subscriber.handler",
     *   timeout: "60 seconds"
     * });
     * ```
     */
    static subscribe(name: string, topicArn: Input<string>, subscriber: Input<string | FunctionArgs | FunctionArn>, args?: SnsTopicSubscriberArgs): Output<SnsTopicLambdaSubscriber>;
    /**
     * @deprecated The subscribe function now requires a `name` parameter as the first argument.
     * To migrate, remove the current subscriber, deploy the changes, and then add the subscriber
     * back with the new `name` argument.
     */
    static subscribe(topicArn: Input<string>, subscriber: Input<string | FunctionArgs | FunctionArn>, args?: SnsTopicSubscriberArgs): Output<SnsTopicLambdaSubscriber>;
    private static _subscribeFunction;
    private static _subscribeFunctionV1;
    /**
     * Subscribe to this SNS Topic with an SQS Queue.
     *
     * @param name The name of the subscriber.
     * @param queue The ARN of the queue or `Queue` component that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have a queue.
     *
     * ```js title="sst.config.ts"
     * const queue = sst.aws.Queue("MyQueue");
     * ```
     *
     * You can subscribe to this topic with it.
     *
     * ```js title="sst.config.ts"
     * topic.subscribeQueue("MySubscriber", queue.arn);
     * ```
     *
     * Add a filter to the subscription.
     *
     * ```js title="sst.config.ts"
     * topic.subscribeQueue("MySubscriber", queue.arn, {
     *   filter: {
     *     price_usd: [{numeric: [">=", 100]}]
     *   }
     * });
     * ```
     */
    subscribeQueue(name: string, queue: Input<string | Queue>, args?: SnsTopicSubscriberArgs): Output<SnsTopicQueueSubscriber>;
    /**
     * @deprecated The subscribe function now requires a `name` parameter as the first argument.
     * To migrate, remove the current subscriber, deploy the changes, and then add the subscriber
     * back with the new `name` argument.
     */
    subscribeQueue(queue: Input<string>, args?: SnsTopicSubscriberArgs): Output<SnsTopicQueueSubscriber>;
    /**
     * Subscribe to an existing SNS Topic with a previously created SQS Queue.
     *
     * @param name The name of the subscriber.
     * @param topicArn The ARN of the SNS Topic to subscribe to.
     * @param queue The ARN of the queue or `Queue` component that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have an existing SNS Topic and SQS Queue with the following ARNs.
     *
     * ```js title="sst.config.ts"
     * const topicArn = "arn:aws:sns:us-east-1:123456789012:MyTopic";
     * const queueArn = "arn:aws:sqs:us-east-1:123456789012:MyQueue";
     * ```
     *
     * You can subscribe to the topic with the queue.
     *
     * ```js title="sst.config.ts"
     * sst.aws.SnsTopic.subscribeQueue("MySubscriber", topicArn, queueArn);
     * ```
     *
     * Add a filter to the subscription.
     *
     * ```js title="sst.config.ts"
     * sst.aws.SnsTopic.subscribeQueue("MySubscriber", topicArn, queueArn, {
     *   filter: {
     *     price_usd: [{numeric: [">=", 100]}]
     *   }
     * });
     * ```
     */
    static subscribeQueue(name: string, topicArn: Input<string>, queue: Input<string | Queue>, args?: SnsTopicSubscriberArgs): Output<SnsTopicQueueSubscriber>;
    /**
     * @deprecated The subscribe function now requires a `name` parameter as the first argument.
     * To migrate, remove the current subscriber, deploy the changes, and then add the subscriber
     * back with the new `name` argument.
     */
    static subscribeQueue(topicArn: Input<string>, queue: Input<string>, args?: SnsTopicSubscriberArgs): Output<SnsTopicQueueSubscriber>;
    private static _subscribeQueue;
    private static _subscribeQueueV1;
    /**
     * Reference an existing SNS topic with its topic ARN. This is useful when you create a
     * topic in one stage and want to share it in another stage. It avoids having to create
     * a new topic in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share SNS topics across stages.
     * :::
     *
     * @param name The name of the component.
     * @param topicArn The ARN of the existing SNS Topic.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a topic in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new topic, you want to share the topic from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const topic = $app.stage === "frank"
     *   ? sst.aws.SnsTopic.get("MyTopic", "arn:aws:sns:us-east-1:123456789012:MyTopic")
     *   : new sst.aws.SnsTopic("MyTopic");
     * ```
     *
     * Here `arn:aws:sns:us-east-1:123456789012:MyTopic` is the ARN of the topic created in
     * the `dev` stage. You can find this by outputting the topic ARN in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return topic.arn;
     * ```
     */
    static get(name: string, topicArn: Input<string>, opts?: ComponentResourceOptions): SnsTopic;
    /** @internal */
    getSSTLink(): {
        properties: {
            arn: Output<string>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
}
