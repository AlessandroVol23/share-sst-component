import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { FunctionArgs, Function } from ".";
import { Input } from "../input";
export interface OpenControlArgs {
    /**
     * The function that's running your OpenControl server.
     *
     * @example
     * ```js
     * {
     *   server: "src/server.handler"
     * }
     * ```
     *
     * You can also pass in the full `FunctionArgs`.
     *
     * ```js
     * {
     *   server: {
     *     handler: "src/server.handler",
     *     link: [table]
     *   }
     * }
     * ```
     *
     * Since the `server` function is a Hono app, you want to export it with the Lambda adapter.
     *
     * ```ts title="src/server.ts"
     * import { handle } from "hono/aws-lambda";
     * import { create } from "opencontrol";
     *
     * const app = create({
     *   // ...
     * });
     *
     * export const handler = handle(app);
     * ```
     *
     * Learn more in the [OpenControl docs](https://opencontrol.ai) on how to
     * configure the `server` function.
     */
    server: Input<string | FunctionArgs>;
}
/**
 * The `OpenControl` component lets you deploy your
 * [OpenControl](https://opencontrol.ai) server to
 * [AWS Lambda](https://aws.amazon.com/lambda/).
 *
 * :::note
 * OpenControl is currently in beta.
 * :::
 *
 * @example
 *
 * #### Create an OpenControl server
 *
 * ```ts title="sst.config.ts"
 * const server = new sst.aws.OpenControl("MyServer", {
 *   server: "src/server.handler"
 * });
 * ```
 *
 * #### Link your AI API keys
 *
 * ```ts title="sst.config.ts" {6}
 * const anthropicKey = new sst.Secret("AnthropicKey");
 *
 * const server = new sst.aws.OpenControl("MyServer", {
 *   server: {
 *     handler: "src/server.handler",
 *     link: [anthropicKey]
 *   }
 * });
 * ```
 *
 * #### Link your resources
 *
 * If your tools are need access to specific resources, you can link them to the
 * OpenControl server.
 *
 * ```ts title="sst.config.ts" {6}
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.OpenControl("MyServer", {
 *   server: {
 *     handler: "src/server.handler",
 *     link: [bucket]
 *   }
 * });
 * ```
 *
 * #### Give AWS permissions
 *
 * If you are using the AWS tool within OpenControl, you will need to give
 * your OpenControl server permissions to access your AWS account.
 *
 * ```ts title="sst.config.ts" {4-6}
 * new sst.aws.OpenControl("OpenControl", {
 *   server: {
 *     handler: "src/server.handler",
 *     policies: $dev
 *       ? ["arn:aws:iam::aws:policy/AdministratorAccess"]
 *       : ["arn:aws:iam::aws:policy/ReadOnlyAccess"]
 *   }
 * });
 * ```
 *
 * Here we are giving it admin access in dev but read-only access in prod.
 *
 * #### Define your server
 *
 * Your `server` function might look like this.
 *
 * ```ts title="src/server.ts"
 * import { Resource } from "sst";
 * import { create } from "opencontrol";
 * import { tool } from "opencontrol/tool";
 * import { handle } from "hono/aws-lambda";
 * import { createAnthropic } from "@ai-sdk/anthropic";
 *
 * const myTool = tool({
 *   name: "my_tool",
 *   description: "Get the most popular greeting",
 *   async run() {
 *     return "Hello, world!";
 *   }
 * });
 *
 * const app = create({
 *   model: createAnthropic({
 *     apiKey: Resource.AnthropicKey.value,
 *   })("claude-3-7-sonnet-20250219"),
 *   tools: [myTool],
 * });
 *
 * export const handler = handle(app);
 * ```
 *
 * Learn more in the [OpenControl docs](https://opencontrol.ai) on how to configure
 * the `server` function.
 */
export declare class OpenControl extends Component {
    private readonly _server;
    private readonly _key;
    constructor(name: string, args: OpenControlArgs, opts?: ComponentResourceOptions);
    /**
     * The URL of the OpenControl server.
     */
    get url(): Output<string>;
    /**
     * The password for the OpenControl server.
     */
    get password(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Function component for the server.
         */
        server: Output<Function>;
    };
}
