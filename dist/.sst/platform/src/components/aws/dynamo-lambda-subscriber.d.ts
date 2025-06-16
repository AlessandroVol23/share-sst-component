import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { FunctionArgs } from "./function";
import { DynamoSubscriberArgs } from "./dynamo";
export interface Args extends DynamoSubscriberArgs {
    /**
     * The DynamoDB table to use.
     */
    dynamo: Input<{
        /**
         * The ARN of the stream.
         */
        streamArn: Input<string>;
    }>;
    /**
     * The subscriber function.
     */
    subscriber: Input<string | FunctionArgs>;
    /**
     * In early versions of SST, parent were forgotten to be set for resources in components.
     * This flag is used to disable the automatic setting of the parent to prevent breaking
     * changes.
     * @internal
     */
    disableParent?: boolean;
}
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
export declare class DynamoLambdaSubscriber extends Component {
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
        readonly function: import("@pulumi/pulumi").Output<import("./function").Function>;
        /**
         * The Lambda event source mapping.
         */
        eventSourceMapping: import("@pulumi/aws/lambda/eventSourceMapping").EventSourceMapping;
    };
}
