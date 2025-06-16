import { jsonStringify, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { lambda, sns } from "@pulumi/aws";
import { functionBuilder } from "./helpers/function-builder";
/**
 * The `SnsTopicLambdaSubscriber` component is internally used by the `SnsTopic` component
 * to add subscriptions to your [Amazon SNS Topic](https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `SnsTopic` component.
 */
export class SnsTopicLambdaSubscriber extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const topic = output(args.topic);
        const fn = createFunction();
        const permission = createPermission();
        const subscription = createSubscription();
        this.fn = fn;
        this.permission = permission;
        this.subscription = subscription;
        function createFunction() {
            return functionBuilder(`${name}Function`, args.subscriber, {
                description: `Subscribed to ${name}`,
            }, undefined, { parent: self });
        }
        function createPermission() {
            return new lambda.Permission(`${name}Permission`, {
                action: "lambda:InvokeFunction",
                function: fn.arn,
                principal: "sns.amazonaws.com",
                sourceArn: topic.arn,
            }, { parent: self });
        }
        function createSubscription() {
            return new sns.TopicSubscription(...transform(args?.transform?.subscription, `${name}Subscription`, {
                topic: topic.arn,
                protocol: "lambda",
                endpoint: fn.arn,
                filterPolicy: args.filter && jsonStringify(args.filter),
            }, { parent: self, dependsOn: [permission] }));
        }
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        const self = this;
        return {
            /**
             * The Lambda function that'll be notified.
             */
            get function() {
                return self.fn.apply((fn) => fn.getFunction());
            },
            /**
             * The Lambda permission.
             */
            permission: this.permission,
            /**
             * The SNS Topic subscription.
             */
            subscription: this.subscription,
        };
    }
}
const __pulumiType = "sst:aws:SnsTopicLambdaSubscriber";
// @ts-expect-error
SnsTopicLambdaSubscriber.__pulumiType = __pulumiType;
