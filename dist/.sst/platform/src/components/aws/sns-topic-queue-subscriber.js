import { jsonStringify, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { sns } from "@pulumi/aws";
import { Queue } from "./queue";
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
export class SnsTopicQueueSubscriber extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const topic = output(args.topic);
        const queueArn = output(args.queue).apply((queue) => queue instanceof Queue ? queue.arn : output(queue));
        const policy = createPolicy();
        const subscription = createSubscription();
        this.policy = policy;
        this.subscription = subscription;
        function createPolicy() {
            return Queue.createPolicy(`${name}Policy`, queueArn, {
                parent: args.disableParent ? undefined : self,
            });
        }
        function createSubscription() {
            return new sns.TopicSubscription(...transform(args?.transform?.subscription, `${name}Subscription`, {
                topic: topic.arn,
                protocol: "sqs",
                endpoint: queueArn,
                filterPolicy: args.filter && jsonStringify(args.filter),
            }, { parent: args.disableParent ? undefined : self }));
        }
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The SQS Queue policy.
             */
            policy: this.policy,
            /**
             * The SNS Topic subscription.
             */
            subscription: this.subscription,
        };
    }
}
const __pulumiType = "sst:aws:SnsTopicQueueSubscriber";
// @ts-expect-error
SnsTopicQueueSubscriber.__pulumiType = __pulumiType;
