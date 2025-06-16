import { all, interpolate, output, } from "@pulumi/pulumi";
import { Component, outputId, transform } from "../component";
import { hashStringToPrettyString, logicalName } from "../naming";
import { parseDynamoStreamArn } from "./helpers/arn";
import { DynamoLambdaSubscriber } from "./dynamo-lambda-subscriber";
import { dynamodb } from "@pulumi/aws";
import { permission } from "./permission";
import { isFunctionSubscriber } from "./helpers/subscriber";
/**
 * The `Dynamo` component lets you add an [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) table to your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
 * const table = new sst.aws.Dynamo("MyTable", {
 *   fields: {
 *     userId: "string",
 *     noteId: "string"
 *   },
 *   primaryIndex: { hashKey: "userId", rangeKey: "noteId" }
 * });
 * ```
 *
 * #### Add a global index
 *
 * Optionally add a global index to the table.
 *
 * ```ts {8-10} title="sst.config.ts"
 * new sst.aws.Dynamo("MyTable", {
 *   fields: {
 *     userId: "string",
 *     noteId: "string",
 *     createdAt: "number",
 *   },
 *   primaryIndex: { hashKey: "userId", rangeKey: "noteId" },
 *   globalIndexes: {
 *     CreatedAtIndex: { hashKey: "userId", rangeKey: "createdAt" }
 *   }
 * });
 * ```
 *
 * #### Add a local index
 *
 * Optionally add a local index to the table.
 *
 * ```ts {8-10} title="sst.config.ts"
 * new sst.aws.Dynamo("MyTable", {
 *   fields: {
 *     userId: "string",
 *     noteId: "string",
 *     createdAt: "number",
 *   },
 *   primaryIndex: { hashKey: "userId", rangeKey: "noteId" },
 *   localIndexes: {
 *     CreatedAtIndex: { rangeKey: "createdAt" }
 *   }
 * });
 * ```
 *
 * #### Subscribe to a DynamoDB Stream
 *
 * To subscribe to a [DynamoDB Stream](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html), start by enabling it.
 *
 * ```ts {7} title="sst.config.ts"
 * const table = new sst.aws.Dynamo("MyTable", {
 *   fields: {
 *     userId: "string",
 *     noteId: "string"
 *   },
 *   primaryIndex: { hashKey: "userId", rangeKey: "noteId" },
 *   stream: "new-and-old-images"
 * });
 * ```
 *
 * Then, subscribing to it.
 *
 * ```ts title="sst.config.ts"
 * table.subscribe("MySubscriber", "src/subscriber.handler");
 * ```
 *
 * #### Link the table to a resource
 *
 * You can link the table to other resources, like a function or your Next.js app.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [table]
 * });
 * ```
 *
 * Once linked, you can query the table through your app.
 *
 * ```ts title="app/page.tsx" {1,8}
 * import { Resource } from "sst";
 * import { DynamoDBClient, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
 *
 * const client = new DynamoDBClient();
 *
 * await client.send(new QueryCommand({
 *   TableName: Resource.MyTable.name,
 *   KeyConditionExpression: "userId = :userId",
 *   ExpressionAttributeValues: {
 *     ":userId": "my-user-id"
 *   }
 * }));
 * ```
 */
export class Dynamo extends Component {
    constructor(name, args, opts = {}) {
        super(__pulumiType, name, args, opts);
        this.isStreamEnabled = false;
        this.constructorName = name;
        this.constructorOpts = opts;
        if (args && "ref" in args) {
            const ref = args;
            this.table = output(ref.table);
            return;
        }
        const parent = this;
        const table = createTable();
        this.table = table;
        this.isStreamEnabled = Boolean(args.stream);
        function createTable() {
            return all([
                args.fields,
                args.primaryIndex,
                args.globalIndexes,
                args.localIndexes,
                args.stream,
                args.deletionProtection,
            ]).apply(([fields, primaryIndex, globalIndexes, localIndexes, stream, deletionProtection,]) => new dynamodb.Table(...transform(args.transform?.table, `${name}Table`, {
                attributes: Object.entries(fields).map(([name, type]) => ({
                    name,
                    type: type === "string" ? "S" : type === "number" ? "N" : "B",
                })),
                billingMode: "PAY_PER_REQUEST",
                hashKey: primaryIndex.hashKey,
                rangeKey: primaryIndex.rangeKey,
                streamEnabled: Boolean(stream),
                streamViewType: stream
                    ? stream.toUpperCase().replaceAll("-", "_")
                    : undefined,
                pointInTimeRecovery: {
                    enabled: true,
                },
                ttl: args.ttl === undefined
                    ? undefined
                    : {
                        attributeName: args.ttl,
                        enabled: true,
                    },
                globalSecondaryIndexes: Object.entries(globalIndexes ?? {}).map(([name, index]) => ({
                    name,
                    hashKey: index.hashKey,
                    rangeKey: index.rangeKey,
                    ...(index.projection === "keys-only"
                        ? { projectionType: "KEYS_ONLY" }
                        : Array.isArray(index.projection)
                            ? {
                                projectionType: "INCLUDE",
                                nonKeyAttributes: index.projection,
                            }
                            : { projectionType: "ALL" }),
                })),
                localSecondaryIndexes: Object.entries(localIndexes ?? {}).map(([name, index]) => ({
                    name,
                    rangeKey: index.rangeKey,
                    ...(index.projection === "keys-only"
                        ? { projectionType: "KEYS_ONLY" }
                        : Array.isArray(index.projection)
                            ? {
                                projectionType: "INCLUDE",
                                nonKeyAttributes: index.projection,
                            }
                            : { projectionType: "ALL" }),
                })),
                deletionProtectionEnabled: deletionProtection,
            }, { parent })));
        }
    }
    /**
     * The ARN of the DynamoDB Table.
     */
    get arn() {
        return this.table.arn;
    }
    /**
     * The name of the DynamoDB Table.
     */
    get name() {
        return this.table.name;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon DynamoDB Table.
             */
            table: this.table,
        };
    }
    subscribe(nameOrSubscriber, subscriberOrArgs, args) {
        const sourceName = this.constructorName;
        // Validate stream is enabled
        if (!this.isStreamEnabled)
            throw new Error(`Cannot subscribe to "${sourceName}" because stream is not enabled.`);
        return isFunctionSubscriber(subscriberOrArgs).apply((v) => v
            ? Dynamo._subscribe(nameOrSubscriber, // name
            this.constructorName, this.nodes.table.streamArn, subscriberOrArgs, // subscriber
            args, { provider: this.constructorOpts.provider })
            : Dynamo._subscribeV1(this.constructorName, this.nodes.table.streamArn, nameOrSubscriber, // subscriber
            subscriberOrArgs, // args
            { provider: this.constructorOpts.provider }));
    }
    static subscribe(nameOrStreamArn, streamArnOrSubscriber, subscriberOrArgs, args) {
        return isFunctionSubscriber(subscriberOrArgs).apply((v) => v
            ? output(streamArnOrSubscriber).apply((streamArn) => this._subscribe(nameOrStreamArn, // name
            logicalName(parseDynamoStreamArn(streamArn).tableName), streamArn, subscriberOrArgs, // subscriber
            args))
            : output(nameOrStreamArn).apply((streamArn) => this._subscribeV1(logicalName(parseDynamoStreamArn(streamArn).tableName), streamArn, streamArnOrSubscriber, // subscriber
            subscriberOrArgs)));
    }
    static _subscribe(subscriberName, name, streamArn, subscriber, args = {}, opts = {}) {
        return output(args).apply((args) => new DynamoLambdaSubscriber(`${name}Subscriber${subscriberName}`, {
            dynamo: { streamArn },
            subscriber,
            ...args,
        }, opts));
    }
    static _subscribeV1(name, streamArn, subscriber, args = {}, opts = {}) {
        return all([name, subscriber, args]).apply(([name, subscriber, args]) => {
            const suffix = logicalName(hashStringToPrettyString([
                typeof streamArn === "string" ? streamArn : outputId,
                JSON.stringify(args.filters ?? {}),
                typeof subscriber === "string" ? subscriber : subscriber.handler,
            ].join(""), 6));
            return new DynamoLambdaSubscriber(`${name}Subscriber${suffix}`, {
                dynamo: { streamArn },
                subscriber,
                disableParent: true,
                ...args,
            }, opts);
        });
    }
    /**
     * Reference an existing DynamoDB Table with the given table name. This is useful when you
     * create a table in one stage and want to share it in another stage. It avoid having to
     * create a new table in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share a table across stages.
     * :::
     *
     * @param name The name of the component.
     * @param tableName The name of the DynamoDB Table.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a table in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new table, you want to share the table from `dev`.
     *
     * ```ts title=sst.config.ts"
     * const table = $app.stage === "frank"
     *  ? sst.aws.Dynamo.get("MyTable", "app-dev-mytable")
     *  : new sst.aws.Dynamo("MyTable");
     * ```
     *
     * Here `app-dev-mytable` is the name of the DynamoDB Table created in the `dev` stage.
     * You can find this by outputting the table name in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   table: table.name
     * };
     * ```
     */
    static get(name, tableName, opts) {
        return new Dynamo(name, {
            ref: true,
            table: dynamodb.Table.get(`${name}Table`, tableName, undefined, opts),
        });
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                name: this.name,
            },
            include: [
                permission({
                    actions: ["dynamodb:*"],
                    resources: [this.arn, interpolate `${this.arn}/*`],
                }),
            ],
        };
    }
}
const __pulumiType = "sst:aws:Dynamo";
// @ts-expect-error
Dynamo.__pulumiType = __pulumiType;
