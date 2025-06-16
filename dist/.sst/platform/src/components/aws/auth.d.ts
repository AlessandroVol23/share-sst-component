import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { Link } from "../link";
import { FunctionArgs, Function, Dynamo, CdnArgs, Router } from ".";
import { Auth as AuthV1 } from "./auth-v1";
import { Input } from "../input";
export interface AuthArgs {
    /**
     * The issuer function.
     * @deprecated renamed to `issuer`
     * @example
     * ```js
     * {
     *   authorizer: "src/auth.handler"
     * }
     * ```
     *
     * You can also pass in the full `FunctionArgs`.
     *
     * ```js
     * {
     *   authorizer: {
     *     handler: "src/auth.handler",
     *     link: [table]
     *   }
     * }
     * ```
     */
    authorizer?: Input<string | FunctionArgs>;
    /**
     * The function that's running your OpenAuth server.
     *
     * @example
     * ```js
     * {
     *   issuer: "src/auth.handler"
     * }
     * ```
     *
     * You can also pass in the full `FunctionArgs`.
     *
     * ```js
     * {
     *   issuer: {
     *     handler: "src/auth.handler",
     *     link: [table]
     *   }
     * }
     * ```
     *
     * Since the `issuer` function is a Hono app, you want to export it with the Lambda adapter.
     *
     * ```ts title="src/auth.ts"
     * import { handle } from "hono/aws-lambda";
     * import { issuer } from "@openauthjs/openauth";
     *
     * const app = issuer({
     *   // ...
     * });
     *
     * export const handler = handle(app);
     * ```
     *
     * This `Auth` component will always use the
     * [`DynamoStorage`](https://openauth.js.org/docs/storage/dynamo/) storage provider.
     *
     * :::note
     * This will always use the `DynamoStorage` storage provider.
     * :::
     *
     * Learn more on the [OpenAuth docs](https://openauth.js.org/docs/issuer/) on how to configure
     * the `issuer` function.
     */
    issuer?: Input<string | FunctionArgs>;
    /**
     * Set a custom domain for your Auth server.
     *
     * Automatically manages domains hosted on AWS Route 53, Cloudflare, and Vercel. For other
     * providers, you'll need to pass in a `cert` that validates domain ownership and add the
     * DNS records.
     *
     * :::tip
     * Built-in support for AWS Route 53, Cloudflare, and Vercel. And manual setup for other
     * providers.
     * :::
     *
     * @example
     *
     * By default this assumes the domain is hosted on Route 53.
     *
     * ```js
     * {
     *   domain: "auth.example.com"
     * }
     * ```
     *
     * For domains hosted on Cloudflare.
     *
     * ```js
     * {
     *   domain: {
     *     name: "auth.example.com",
     *     dns: sst.cloudflare.dns()
     *   }
     * }
     * ```
     */
    domain?: CdnArgs["domain"];
    /**
     * Force upgrade from `Auth.v1` to the latest `Auth` version. The only valid value
     * is `v2`, which is the version of the new `Auth`.
     *
     * The latest `Auth` is powered by [OpenAuth](https://openauth.js.org). To
     * upgrade, add the prop.
     *
     * ```ts
     * {
     *   forceUpgrade: "v2"
     * }
     * ```
     *
     * Run `sst deploy`.
     *
     * :::tip
     * You can remove this prop after you upgrade.
     * :::
     *
     * This upgrades your component and the resources it created. You can now optionally
     * remove the prop.
     *
     * @internal
     */
    forceUpgrade?: "v2";
}
/**
 * The `Auth` component lets you create centralized auth servers on AWS. It deploys
 * [OpenAuth](https://openauth.js.org) to [AWS Lambda](https://aws.amazon.com/lambda/)
 * and uses [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) for storage.
 *
 * :::note
 * `Auth` and OpenAuth are currently in beta.
 * :::
 *
 * @example
 *
 * #### Create an OpenAuth server
 *
 * ```ts title="sst.config.ts"
 * const auth = new sst.aws.Auth("MyAuth", {
 *   issuer: "src/auth.handler"
 * });
 * ```
 *
 * Where the `issuer` function might look like this.
 *
 * ```ts title="src/auth.ts"
 * import { handle } from "hono/aws-lambda";
 * import { issuer } from "@openauthjs/openauth";
 * import { CodeProvider } from "@openauthjs/openauth/provider/code";
 * import { subjects } from "./subjects";
 *
 * const app = issuer({
 *   subjects,
 *   providers: {
 *     code: CodeProvider()
 *   },
 *   success: async (ctx, value) => {}
 * });
 *
 * export const handler = handle(app);
 * ```
 *
 * This `Auth` component will always use the
 * [`DynamoStorage`](https://openauth.js.org/docs/storage/dynamo/) storage provider.
 *
 * Learn more on the [OpenAuth docs](https://openauth.js.org/docs/issuer/) on how to configure
 * the `issuer` function.
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your auth server.
 *
 * ```js {3} title="sst.config.ts"
 * new sst.aws.Auth("MyAuth", {
 *   issuer: "src/auth.handler",
 *   domain: "auth.example.com"
 * });
 * ```
 *
 * #### Link to a resource
 *
 * You can link the auth server to other resources, like a function or your Next.js app,
 * that needs authentication.
 *
 * ```ts title="sst.config.ts" {2}
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [auth]
 * });
 * ```
 *
 * Once linked, you can now use it to create an [OpenAuth
 * client](https://openauth.js.org/docs/client/).
 *
 * ```ts title="app/page.tsx" {1,6}
 * import { Resource } from "sst"
 * import { createClient } from "@openauthjs/openauth/client"
 *
 * export const client = createClient({
 *   clientID: "nextjs",
 *   issuer: Resource.MyAuth.url
 * });
 * ```
 */
export declare class Auth extends Component implements Link.Linkable {
    private readonly _table;
    private readonly _issuer;
    private readonly _router?;
    static v1: typeof AuthV1;
    constructor(name: string, args: AuthArgs, opts?: ComponentResourceOptions);
    /**
     * The URL of the Auth component.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated function URL for the issuer.
     */
    get url(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The DynamoDB component.
         */
        table: Dynamo;
        /**
         * The Function component for the issuer.
         */
        issuer: Output<Function>;
        /**
         * @deprecated Use `issuer` instead.
         * The Function component for the issuer.
         */
        authorizer: Output<Function>;
        /**
         * The Router component for the custom domain.
         */
        router: Router | undefined;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            url: Output<string>;
        };
        include: {
            type: "environment";
            env: Record<string, Input<string>>;
        }[];
    };
}
