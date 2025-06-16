import * as aws from "@pulumi/aws";
import { all, output } from "@pulumi/pulumi";
import { Component, transform } from "../component.js";
import { hashStringToPrettyString, logicalName } from "../naming.js";
import { KinesisStreamLambdaSubscriber } from "./kinesis-stream-lambda-subscriber.js";
import { parseKinesisStreamArn } from "./helpers/arn.js";
import { permission } from "./permission.js";
import { isFunctionSubscriber } from "./helpers/subscriber.js";
/**
 * The `KinesisStream` component lets you add an [Amazon Kinesis Data Streams](https://docs.aws.amazon.com/streams/latest/dev/introduction.html) to your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
 * const stream = new sst.aws.KinesisStream("MyStream");
 * ```
 *
 * #### Subscribe to a stream
 *
 * ```ts title="sst.config.ts"
 * stream.subscribe("MySubscriber", "src/subscriber.handler");
 * ```
 *
 * #### Link the stream to a resource
 *
 * You can link the stream to other resources, like a function or your Next.js app.
 *
 * ```ts {2} title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [stream]
 * });
 * ```
 *
 * Once linked, you can write to the stream from your function code.
 *
 * ```ts title="app/page.tsx" {1,7}
 * import { Resource } from "sst";
 * import { KinesisClient, PutRecordCommand } from "@aws-sdk/client-kinesis";
 *
 * const client = new KinesisClient();
 *
 * await client.send(new PutRecordCommand({
 *   StreamName: Resource.MyStream.name,
 *   Data: JSON.stringify({ foo: "bar" }),
 *   PartitionKey: "myKey",
 * }));
 * ```
 */
export class KinesisStream extends Component {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
        const parent = this;
        const stream = createStream();
        this.stream = stream;
        this.constructorName = name;
        this.constructorOpts = opts;
        function createStream() {
            return new aws.kinesis.Stream(...transform(args?.transform?.stream, `${name}Stream`, {
                streamModeDetails: {
                    streamMode: "ON_DEMAND",
                },
            }, { parent }));
        }
    }
    subscribe(nameOrSubscriber, subscriberOrArgs, args) {
        return isFunctionSubscriber(subscriberOrArgs).apply((v) => v
            ? KinesisStream._subscribe(nameOrSubscriber, // name
            this.constructorName, this.nodes.stream.arn, subscriberOrArgs, // subscriber
            args, { provider: this.constructorOpts.provider })
            : KinesisStream._subscribeV1(this.constructorName, this.nodes.stream.arn, nameOrSubscriber, // subscriber
            subscriberOrArgs, // args
            { provider: this.constructorOpts.provider }));
    }
    static subscribe(nameOrStreamArn, streamArnOrSubscriber, subscriberOrArgs, args) {
        return isFunctionSubscriber(subscriberOrArgs).apply((v) => v
            ? output(streamArnOrSubscriber).apply((streamArn) => this._subscribe(nameOrStreamArn, // name
            logicalName(parseKinesisStreamArn(streamArn).streamName), streamArn, subscriberOrArgs, // subscriber
            args))
            : output(nameOrStreamArn).apply((streamArn) => this._subscribeV1(logicalName(parseKinesisStreamArn(streamArn).streamName), streamArn, streamArnOrSubscriber, // subscriber
            subscriberOrArgs)));
    }
    static _subscribe(subscriberName, name, streamArn, subscriber, args = {}, opts = {}) {
        return output(args).apply((args) => new KinesisStreamLambdaSubscriber(`${name}Subscriber${subscriberName}`, {
            stream: { arn: streamArn },
            subscriber,
            ...args,
        }, opts));
    }
    static _subscribeV1(name, streamArn, subscriber, args = {}, opts = {}) {
        return all([streamArn, subscriber, args]).apply(([streamArn, subscriber, args]) => {
            const suffix = logicalName(hashStringToPrettyString([
                streamArn,
                JSON.stringify(args.filters ?? {}),
                typeof subscriber === "string" ? subscriber : subscriber.handler,
            ].join(""), 6));
            return new KinesisStreamLambdaSubscriber(`${name}Subscriber${suffix}`, {
                stream: { arn: streamArn },
                subscriber,
                ...args,
            }, opts);
        });
    }
    get name() {
        return this.stream.name;
    }
    get arn() {
        return this.stream.arn;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon Kinesis Data Stream.
             */
            stream: this.stream,
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                name: this.stream.name,
            },
            include: [
                permission({
                    actions: ["kinesis:*"],
                    resources: [this.nodes.stream.arn],
                }),
            ],
        };
    }
}
const __pulumiType = "sst:aws:KinesisStream";
// @ts-expect-error
KinesisStream.__pulumiType = __pulumiType;
