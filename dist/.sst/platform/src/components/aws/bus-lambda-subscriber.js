import { interpolate, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { createRule } from "./bus-base-subscriber";
import { cloudwatch, lambda } from "@pulumi/aws";
import { functionBuilder } from "./helpers/function-builder";
/**
 * The `BusLambdaSubscriber` component is internally used by the `Bus` component
 * to add subscriptions to [Amazon EventBridge Event Bus](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `Bus` component.
 */
export class BusLambdaSubscriber extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const bus = output(args.bus);
        const rule = createRule(name, bus.name, args, self);
        const fn = createFunction();
        const permission = createPermission();
        const target = createTarget();
        this.fn = fn;
        this.permission = permission;
        this.rule = rule;
        this.target = target;
        function createFunction() {
            return functionBuilder(`${name}Function`, args.subscriber, {
                description: interpolate `Subscribed to ${bus.name}`,
            }, undefined, { parent: self });
        }
        function createPermission() {
            return new lambda.Permission(`${name}Permission`, {
                action: "lambda:InvokeFunction",
                function: fn.arn,
                principal: "events.amazonaws.com",
                sourceArn: rule.arn,
            }, { parent: self });
        }
        function createTarget() {
            return new cloudwatch.EventTarget(...transform(args?.transform?.target, `${name}Target`, {
                arn: fn.arn,
                rule: rule.name,
                eventBusName: bus.name,
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
             * The EventBus rule.
             */
            rule: this.rule,
            /**
             * The EventBus target.
             */
            target: this.target,
        };
    }
}
const __pulumiType = "sst:aws:BusLambdaSubscriber";
// @ts-expect-error
BusLambdaSubscriber.__pulumiType = __pulumiType;
