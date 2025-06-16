import { all, output } from "@pulumi/pulumi";
import { Component, outputId, transform } from "../component";
import { hashStringToPrettyString, logicalName } from "../naming";
import { parseTopicArn } from "./helpers/arn";
import { SnsTopicLambdaSubscriber } from "./sns-topic-lambda-subscriber";
import { SnsTopicQueueSubscriber } from "./sns-topic-queue-subscriber";
import { sns } from "@pulumi/aws";
import { permission } from "./permission";
import { isFunctionSubscriber, isQueueSubscriber } from "./helpers/subscriber";
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
export class SnsTopic extends Component {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
        const self = this;
        this.constructorName = name;
        this.constructorOpts = opts;
        if (args && "ref" in args) {
            const ref = reference();
            this.topic = ref.topic;
            return;
        }
        const fifo = normalizeFifo();
        this.topic = createTopic();
        function reference() {
            const ref = args;
            const topic = sns.Topic.get(`${name}Topic`, ref.topicArn, undefined, {
                parent: self,
            });
            return { topic };
        }
        function normalizeFifo() {
            return output(args.fifo).apply((v) => v ?? false);
        }
        function createTopic() {
            return new sns.Topic(...transform(args.transform?.topic, `${name}Topic`, {
                fifoTopic: fifo,
            }, { parent: self }));
        }
    }
    /**
     * The ARN of the SNS Topic.
     */
    get arn() {
        return this.topic.arn;
    }
    /**
     * The name of the SNS Topic.
     */
    get name() {
        return this.topic.name;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon SNS Topic.
             */
            topic: this.topic,
        };
    }
    subscribe(nameOrSubscriber, subscriberOrArgs, args) {
        return isFunctionSubscriber(subscriberOrArgs).apply((v) => v
            ? SnsTopic._subscribeFunction(nameOrSubscriber, // name
            this.constructorName, this.arn, subscriberOrArgs, // subscriber
            args, { provider: this.constructorOpts.provider })
            : SnsTopic._subscribeFunctionV1(this.constructorName, this.arn, nameOrSubscriber, // subscriber
            subscriberOrArgs, // args
            { provider: this.constructorOpts.provider }));
    }
    static subscribe(nameOrTopicArn, topicArnOrSubscriber, subscriberOrArgs, args) {
        return isFunctionSubscriber(subscriberOrArgs).apply((v) => v
            ? output(topicArnOrSubscriber).apply((topicArn) => this._subscribeFunction(nameOrTopicArn, // name
            logicalName(parseTopicArn(topicArn).topicName), topicArn, subscriberOrArgs, // subscriber
            args))
            : output(nameOrTopicArn).apply((topicArn) => this._subscribeFunctionV1(logicalName(parseTopicArn(topicArn).topicName), topicArn, topicArnOrSubscriber, // subscriber
            subscriberOrArgs)));
    }
    static _subscribeFunction(subscriberName, name, topicArn, subscriber, args = {}, opts = {}) {
        return output(args).apply((args) => new SnsTopicLambdaSubscriber(`${name}Subscriber${subscriberName}`, {
            topic: { arn: topicArn },
            subscriber,
            ...args,
        }, opts));
    }
    static _subscribeFunctionV1(name, topicArn, subscriber, args = {}, opts = {}) {
        return all([subscriber, args]).apply(([subscriber, args]) => {
            const suffix = logicalName(hashStringToPrettyString([
                typeof topicArn === "string" ? topicArn : outputId,
                JSON.stringify(args.filter ?? {}),
                typeof subscriber === "string" ? subscriber : subscriber.handler,
            ].join(""), 6));
            return new SnsTopicLambdaSubscriber(`${name}Subscriber${suffix}`, {
                topic: { arn: topicArn },
                subscriber,
                ...args,
            }, opts);
        });
    }
    subscribeQueue(nameOrQueue, queueOrArgs, args) {
        return isQueueSubscriber(queueOrArgs).apply((v) => v
            ? SnsTopic._subscribeQueue(nameOrQueue, // name
            this.constructorName, this.arn, queueOrArgs, // queue
            args)
            : SnsTopic._subscribeQueueV1(this.constructorName, this.arn, nameOrQueue, // queue
            queueOrArgs));
    }
    static subscribeQueue(nameOrTopicArn, topicArnOrQueue, queueOrArgs, args) {
        return isQueueSubscriber(queueOrArgs).apply((v) => v
            ? output(topicArnOrQueue).apply((topicArn) => this._subscribeQueue(nameOrTopicArn, // name
            logicalName(parseTopicArn(topicArn).topicName), topicArn, queueOrArgs, // queue
            args))
            : output(nameOrTopicArn).apply((topicArn) => this._subscribeQueueV1(logicalName(parseTopicArn(topicArn).topicName), topicArn, topicArnOrQueue, // queue
            queueOrArgs)));
    }
    static _subscribeQueue(subscriberName, name, topicArn, queue, args = {}) {
        return output(args).apply((args) => new SnsTopicQueueSubscriber(`${name}Subscriber${subscriberName}`, {
            topic: { arn: topicArn },
            queue,
            ...args,
        }));
    }
    static _subscribeQueueV1(name, topicArn, queueArn, args = {}) {
        return all([queueArn, args]).apply(([queueArn, args]) => {
            const suffix = logicalName(hashStringToPrettyString([
                typeof topicArn === "string" ? topicArn : outputId,
                JSON.stringify(args.filter ?? {}),
                queueArn,
            ].join(""), 6));
            return new SnsTopicQueueSubscriber(`${name}Subscriber${suffix}`, {
                topic: { arn: topicArn },
                queue: queueArn,
                disableParent: true,
                ...args,
            });
        });
    }
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
    static get(name, topicArn, opts) {
        return new SnsTopic(name, {
            ref: true,
            topicArn,
        }, opts);
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                arn: this.arn,
            },
            include: [
                permission({
                    actions: ["sns:*"],
                    resources: [this.arn],
                }),
            ],
        };
    }
}
const __pulumiType = "sst:aws:SnsTopic";
// @ts-expect-error
SnsTopic.__pulumiType = __pulumiType;
