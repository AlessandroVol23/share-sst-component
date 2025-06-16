import { lambda } from "@pulumi/aws";
import { output } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { functionBuilder } from "./helpers/function-builder";
import { parseFunctionArn } from "./helpers/arn";
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
export class KinesisStreamLambdaSubscriber extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const stream = output(args.stream);
        const fn = createFunction();
        const eventSourceMapping = createEventSourceMapping();
        this.fn = fn;
        this.eventSourceMapping = eventSourceMapping;
        function createFunction() {
            return output(args.subscriber).apply((subscriber) => {
                return functionBuilder(`${name}Function`, subscriber, {
                    description: `Subscribed to ${name}`,
                    permissions: [
                        {
                            actions: [
                                "kinesis:DescribeStream",
                                "kinesis:DescribeStreamSummary",
                                "kinesis:GetRecords",
                                "kinesis:GetShardIterator",
                                "kinesis:ListShards",
                                "kinesis:ListStreams",
                                "kinesis:SubscribeToShard",
                            ],
                            resources: [stream.arn],
                        },
                    ],
                }, undefined, { parent: self });
            });
        }
        function createEventSourceMapping() {
            return new lambda.EventSourceMapping(...transform(args.transform?.eventSourceMapping, `${name}EventSourceMapping`, {
                eventSourceArn: stream.arn,
                functionName: fn.arn.apply((arn) => parseFunctionArn(arn).functionName),
                startingPosition: "LATEST",
                filterCriteria: args.filters && {
                    filters: output(args.filters).apply((filters) => filters.map((filter) => ({
                        pattern: JSON.stringify(filter),
                    }))),
                },
            }, { parent: self }));
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
             * The Lambda event source mapping.
             */
            eventSourceMapping: self.eventSourceMapping,
        };
    }
}
const __pulumiType = "sst:aws:KinesisStreamLambdaSubscriber";
// @ts-expect-error
KinesisStreamLambdaSubscriber.__pulumiType = __pulumiType;
