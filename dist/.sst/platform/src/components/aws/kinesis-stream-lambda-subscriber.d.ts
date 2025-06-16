import { Component } from "../component";
import { Input } from "../input.js";
import { FunctionArgs } from "./function.js";
import { KinesisStreamLambdaSubscriberArgs } from "./kinesis-stream.js";
export interface Args extends KinesisStreamLambdaSubscriberArgs {
    /**
     * The Kinesis stream to use.
     */
    stream: Input<{
        /**
         * The ARN of the stream.
         */
        arn: Input<string>;
    }>;
    /**
     * The subscriber function.
     */
    subscriber: Input<string | FunctionArgs>;
}
/**
 * The `KinesisStreamLambdaSubscriber` component is internally used by the `KinesisStream` component to
 * add a consumer to [Amazon Kinesis Data Streams](https://docs.aws.amazon.com/streams/latest/dev/introduction.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `KinesisStream` component.
 */
export declare class KinesisStreamLambdaSubscriber extends Component {
    private readonly fn;
    private readonly eventSourceMapping;
    constructor(name: string, args: Args, opts?: $util.ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Lambda function that'll be notified.
         */
        readonly function: import("@pulumi/pulumi").Output<import("./function.js").Function>;
        /**
         * The Lambda event source mapping.
         */
        eventSourceMapping: import("@pulumi/aws/lambda/eventSourceMapping").EventSourceMapping;
    };
}
