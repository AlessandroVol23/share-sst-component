import { interpolate, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { lambda } from "@pulumi/aws";
import { iot } from "@pulumi/aws";
import { functionBuilder } from "./helpers/function-builder";
import { parseFunctionArn } from "./helpers/arn";
/**
 * The `RealtimeLambdaSubscriber` component is internally used by the `Realtime` component
 * to add subscriptions to the [AWS IoT endpoint](https://docs.aws.amazon.com/iot/latest/developerguide/what-is-aws-iot.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `Realtime` component.
 */
export class RealtimeLambdaSubscriber extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const normalizedIot = output(args.iot);
        const filter = output(args.filter);
        const fn = createFunction();
        const rule = createRule();
        const permission = createPermission();
        this.fn = fn;
        this.permission = permission;
        this.rule = rule;
        function createFunction() {
            return functionBuilder(`${name}Handler`, args.subscriber, {
                description: interpolate `Subscribed to ${normalizedIot.name} on ${filter}`,
            }, undefined, { parent: self });
        }
        function createRule() {
            return new iot.TopicRule(...transform(args?.transform?.topicRule, `${name}Rule`, {
                sqlVersion: "2016-03-23",
                sql: interpolate `SELECT * FROM '${filter}'`,
                enabled: true,
                lambdas: [{ functionArn: fn.arn }],
            }, { parent: self }));
        }
        function createPermission() {
            return new lambda.Permission(`${name}Permission`, {
                action: "lambda:InvokeFunction",
                function: fn.arn.apply((arn) => parseFunctionArn(arn).functionName),
                principal: "iot.amazonaws.com",
                sourceArn: rule.arn,
            }, { parent: self });
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
             * The IoT Topic rule.
             */
            rule: this.rule,
        };
    }
}
const __pulumiType = "sst:aws:RealtimeLambdaSubscriber";
// @ts-expect-error
RealtimeLambdaSubscriber.__pulumiType = __pulumiType;
