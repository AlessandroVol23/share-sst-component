import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { Function, FunctionArgs } from "./function";
import { QueueSubscriberArgs } from "./queue";
export interface Args extends QueueSubscriberArgs {
    /**
     * The queue to use.
     */
    queue: Input<{
        /**
         * The ARN of the queue.
         */
        arn: Input<string>;
    }>;
    /**
     * The subscriber function.
     */
    subscriber: Input<string | FunctionArgs>;
}
/**
 * The `QueueLambdaSubscriber` component is internally used by the `Queue` component to
 * add a consumer to [Amazon SQS](https://aws.amazon.com/sqs/).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `Queue` component.
 */
export declare class QueueLambdaSubscriber extends Component {
    private readonly fn;
    private readonly eventSourceMapping;
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Lambda function that'll be notified.
         */
        readonly function: Output<Function>;
        /**
         * The Lambda event source mapping.
         */
        eventSourceMapping: import("@pulumi/aws/lambda/eventSourceMapping").EventSourceMapping;
    };
}
