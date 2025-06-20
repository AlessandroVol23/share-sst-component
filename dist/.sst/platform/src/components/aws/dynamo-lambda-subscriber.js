import { output } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { lambda } from "@pulumi/aws";
import { functionBuilder } from "./helpers/function-builder";
import { parseFunctionArn } from "./helpers/arn";
/**
 * The `DynamoLambdaSubscriber` component is internally used by the `Dynamo` component to
 * add stream subscriptions to [Amazon DynamoDB](https://aws.amazon.com/dynamodb/).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `Dynamo` component.
 */
export class DynamoLambdaSubscriber extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const dynamo = output(args.dynamo);
        const fn = createFunction();
        const eventSourceMapping = createEventSourceMapping();
        this.fn = fn;
        this.eventSourceMapping = eventSourceMapping;
        function createFunction() {
            return functionBuilder(`${name}Function`, args.subscriber, {
                description: `Subscribed to ${name}`,
                permissions: [
                    {
                        actions: [
                            "dynamodb:DescribeStream",
                            "dynamodb:GetRecords",
                            "dynamodb:GetShardIterator",
                            "dynamodb:ListStreams",
                        ],
                        resources: [dynamo.streamArn],
                    },
                ],
            }, undefined, { parent: self });
        }
        function createEventSourceMapping() {
            return new lambda.EventSourceMapping(...transform(args.transform?.eventSourceMapping, `${name}EventSourceMapping`, {
                eventSourceArn: dynamo.streamArn,
                functionName: fn.arn.apply((arn) => parseFunctionArn(arn).functionName),
                filterCriteria: args.filters
                    ? output(args.filters).apply((filters) => ({
                        filters: filters.map((filter) => ({
                            pattern: JSON.stringify(filter),
                        })),
                    }))
                    : undefined,
                startingPosition: "LATEST",
            }, { parent: args.disableParent ? undefined : self }));
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
            eventSourceMapping: this.eventSourceMapping,
        };
    }
}
const __pulumiType = "sst:aws:DynamoLambdaSubscriber";
// @ts-expect-error
DynamoLambdaSubscriber.__pulumiType = __pulumiType;
