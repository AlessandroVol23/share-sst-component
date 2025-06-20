import { all } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { Function } from "./function";
import { hashStringToPrettyString, logicalName } from "../naming";
import { RealtimeLambdaSubscriber } from "./realtime-lambda-subscriber";
import { iot, lambda } from "@pulumi/aws";
import { permission } from "./permission";
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
export class Realtime extends Component {
    constructor(name, args, opts = {}) {
        super(__pulumiType, name, args, opts);
        const parent = this;
        const authHadler = createAuthorizerFunction();
        const iotAuthorizer = createAuthorizer();
        createPermission();
        this.constructorOpts = opts;
        this.iotEndpoint = iot.getEndpointOutput({ endpointType: "iot:Data-ATS" }, { parent }).endpointAddress;
        this.constructorName = name;
        this.authHadler = authHadler;
        this.iotAuthorizer = iotAuthorizer;
        function createAuthorizerFunction() {
            return Function.fromDefinition(`${name}AuthorizerHandler`, args.authorizer, {
                description: `Authorizer for ${name}`,
                permissions: [
                    {
                        actions: ["iot:*"],
                        resources: ["*"],
                    },
                ],
            }, undefined, { parent });
        }
        function createAuthorizer() {
            return new iot.Authorizer(...transform(args.transform?.authorizer, `${name}Authorizer`, {
                signingDisabled: true,
                authorizerFunctionArn: authHadler.arn,
            }, { parent }));
        }
        function createPermission() {
            return new lambda.Permission(`${name}Permission`, {
                action: "lambda:InvokeFunction",
                function: authHadler.arn,
                principal: "iot.amazonaws.com",
                sourceArn: iotAuthorizer.arn,
            }, { parent });
        }
    }
    /**
     * The IoT endpoint.
     */
    get endpoint() {
        return this.iotEndpoint;
    }
    /**
     * The name of the IoT authorizer.
     */
    get authorizer() {
        return this.iotAuthorizer.name;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The IoT authorizer resource.
             */
            authorizer: this.iotAuthorizer,
            /**
             * The IoT authorizer function resource.
             */
            authHandler: this.authHadler,
        };
    }
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
    subscribe(subscriber, args) {
        return all([subscriber, args.filter]).apply(([subscriber, filter]) => {
            const suffix = logicalName(hashStringToPrettyString([
                filter,
                typeof subscriber === "string" ? subscriber : subscriber.handler,
            ].join(""), 6));
            return new RealtimeLambdaSubscriber(`${this.constructorName}Subscriber${suffix}`, {
                iot: { name: this.constructorName },
                subscriber,
                ...args,
            }, { provider: this.constructorOpts.provider });
        });
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                endpoint: this.endpoint,
                authorizer: this.authorizer,
            },
            include: [
                permission({
                    actions: ["iot:Publish"],
                    resources: ["*"],
                }),
            ],
        };
    }
}
const __pulumiType = "sst:aws:Realtime";
// @ts-expect-error
Realtime.__pulumiType = __pulumiType;
