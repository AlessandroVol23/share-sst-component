import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { Function, FunctionArgs, FunctionArn } from "./function";
import { RealtimeLambdaSubscriber } from "./realtime-lambda-subscriber";
import { iot } from "@pulumi/aws";
export interface RealtimeArgs {
    /**
     * The Lambda function that'll be used to authorize the client on connection.
     * @example
     * ```js
     * {
     *   authorizer: "src/authorizer.handler"
     * }
     * ```
     */
    authorizer: Input<string | FunctionArgs>;
    /**
     * [Transform](/docs/components#transform) how this subscription creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the IoT authorizer resource.
         */
        authorizer?: Transform<iot.AuthorizerArgs>;
    };
}
export interface RealtimeSubscriberArgs {
    /**
     * Filter the topics that'll be processed by the subscriber.
     *
     * :::tip
     * Learn more about [topic filters](https://docs.aws.amazon.com/iot/latest/developerguide/topics.html#topicfilters).
     * :::
     *
     * @example
     * Subscribe to a specific topic.
     * ```js
     * {
     *   filter: `${$app.name}/${$app.stage}/chat/room1`
     * }
     * ```
     *
     * Subscribe to all topics under a prefix.
     * ```js
     * {
     *   filter: `${$app.name}/${$app.stage}/chat/#`
     * }
     * ```
     */
    filter: Input<string>;
    /**
     * [Transform](/docs/components#transform) how this subscription creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the IoT Topic rule resource.
         */
        topicRule?: Transform<iot.TopicRuleArgs>;
    };
}
/**
 * The `Realtime` component lets you publish and subscribe to messages in realtime.
 *
 * It offers a **topic-based** messaging network using [AWS IoT](https://docs.aws.amazon.com/iot/latest/developerguide/what-is-aws-iot.html). Letting you publish and subscribe to messages using
 * a WebSocket in the browser and your server.
 *
 * Also, provides an [SDK](#sdk) to authorize clients, grant permissions to subscribe, and
 * publish to topics.
 *
 * :::note
 * IoT is shared across all apps and stages in your AWS account. So you need to prefix the
 * topics by the app and stage name.
 * :::
 *
 * There is **only 1 IoT endpoint** per region per AWS account. Messages from all apps and
 * stages are published to the same IoT endpoint. Make sure to prefix the topics by the
 * app and stage name.
 *
 * @example
 *
 * #### Create a realtime endpoint
 *
 * ```ts title="sst.config.ts"
 * const server = new sst.aws.Realtime("MyServer", {
 *   authorizer: "src/authorizer.handler"
 * });
 * ```
 *
 * #### Authorize the client
 *
 * ```ts title="src/authorizer.ts" "realtime.authorizer"
 * import { Resource } from "sst/aws";
 * import { realtime } from "sst/aws/realtime";
 *
 * export const handler = realtime.authorizer(async (token) => {
 *   // Validate the token
 *
 *   // Return the topics to subscribe and publish
 *   return {
 *     subscribe: [`${Resource.App.name}/${Resource.App.stage}/chat/room1`],
 *     publish: [`${Resource.App.name}/${Resource.App.stage}/chat/room1`],
 *   };
 * });
 * ```
 *
 * #### Publish and receive messages in your frontend
 *
 * ```ts title="app/page.tsx"
 * import { Resource } from "sst/aws";
 *
 * const client = new mqtt.MqttClient();
 * // Configure with
 * // - Resource.Realtime.endpoint
 * // - Resource.Realtime.authorizer
 * const connection = client.new_connection(config);
 *
 * // Subscribe messages
 * connection.on("message", (topic, payload) => {
 *   // Handle the message
 * });
 *
 * // Publish messages
 * connection.publish(topic, payload, mqtt.QoS.AtLeastOnce);
 * ```
 *
 * #### Subscribe messages in your backend
 *
 * ```ts title="sst.config.ts"
 * server.subscribe("src/subscriber.handler", {
 *   filter: `${$app.name}/${$app.stage}/chat/room1`
 * });
 * ```
 *
 * #### Publish message from your backend
 *
 * ```ts title="src/lambda.ts"
 * import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
 * const data = new IoTDataPlaneClient();
 * await data.send(
 *   new PublishCommand({
 *     payload: Buffer.from(
 *       JSON.stringify({ message: "Hello world" })
 *     ),
 *     topic: `${Resource.App.name}/${Resource.App.stage}/chat/room1`,
 *   })
 * );
 * ```
 */
export declare class Realtime extends Component implements Link.Linkable {
    private readonly constructorName;
    private constructorOpts;
    private readonly authHadler;
    private readonly iotAuthorizer;
    private readonly iotEndpoint;
    constructor(name: string, args: RealtimeArgs, opts?: ComponentResourceOptions);
    /**
     * The IoT endpoint.
     */
    get endpoint(): Output<string>;
    /**
     * The name of the IoT authorizer.
     */
    get authorizer(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The IoT authorizer resource.
         */
        authorizer: import("@pulumi/aws/iot/authorizer").Authorizer;
        /**
         * The IoT authorizer function resource.
         */
        authHandler: Output<Function>;
    };
    /**
     * Subscribe to this Realtime server.
     *
     * @param subscriber The function that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * ```js title="sst.config.ts"
     * server.subscribe("src/subscriber.handler", {
     *   filter: `${$app.name}/${$app.stage}/chat/room1`
     * });
     * ```
     *
     * Customize the subscriber function.
     *
     * ```js title="sst.config.ts"
     * server.subscribe(
     *   {
     *     handler: "src/subscriber.handler",
     *     timeout: "60 seconds"
     *   },
     *   {
     *     filter: `${$app.name}/${$app.stage}/chat/room1`
     *   }
     * );
     * ```
     *
     * Or pass in the ARN of an existing Lambda function.
     *
     * ```js title="sst.config.ts"
     * server.subscribe("arn:aws:lambda:us-east-1:123456789012:function:my-function", {
     *   filter: `${$app.name}/${$app.stage}/chat/room1`
     * });
     * ```
     */
    subscribe(subscriber: Input<string | FunctionArgs | FunctionArn>, args: RealtimeSubscriberArgs): Output<RealtimeLambdaSubscriber>;
    /** @internal */
    getSSTLink(): {
        properties: {
            endpoint: Output<string>;
            authorizer: Output<string>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
}
