import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { BusBaseSubscriberArgs } from "./bus-base-subscriber";
import { Queue } from "./queue";
export interface Args extends BusBaseSubscriberArgs {
    /**
     * The ARN of the SQS Queue.
     */
    queue: Input<string | Queue>;
}
/**
 * The `BusQueueSubscriber` component is internally used by the `Bus` component
 * to add subscriptions to [Amazon EventBridge Event Bus](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribeQueue` method of the `Bus` component.
 */
export declare class BusQueueSubscriber extends Component {
    private readonly policy;
    private readonly rule;
    private readonly target;
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The SQS Queue policy.
         */
        policy: import("@pulumi/aws/sqs/queuePolicy").QueuePolicy;
        /**
         * The EventBus rule.
         */
        rule: import("@pulumi/aws/cloudwatch/eventRule").EventRule;
        /**
         * The EventBus target.
         */
        target: import("@pulumi/aws/cloudwatch/eventTarget").EventTarget;
    };
}
