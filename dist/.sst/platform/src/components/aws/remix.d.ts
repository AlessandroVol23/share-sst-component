import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import type { Input } from "../input.js";
import { Plan, SsrSite, SsrSiteArgs } from "./ssr-site.js";
export interface RemixArgs extends SsrSiteArgs {
    /**
     * Configure how this component works in `sst dev`.
     *
     * :::note
     * In `sst dev` your Remix app is run in dev mode; it's not deployed.
     * :::
     *
     * Instead of deploying your Remix app, this starts it in dev mode. It's run
     * as a separate process in the `sst dev` multiplexer. Read more about
     * [`sst dev`](/docs/reference/cli/#dev).
     *
     * To disable dev mode, pass in `false`.
     */
    dev?: SsrSiteArgs["dev"];
    /**
     * Permissions and the resources that the [server function](#nodes-server) in your Remix app needs to access. These permissions are used to create the function's IAM role.
     *
     * :::tip
     * If you `link` the function to a resource, the permissions to access it are
     * automatically added.
     * :::
     *
     * @example
     * Allow reading and writing to an S3 bucket called `my-bucket`.
     * ```js
     * {
     *   permissions: [
     *     {
     *       actions: ["s3:GetObject", "s3:PutObject"],
     *       resources: ["arn:aws:s3:::my-bucket/*"]
     *     },
     *   ]
     * }
     * ```
     *
     * Perform all actions on an S3 bucket called `my-bucket`.
     *
     * ```js
     * {
     *   permissions: [
     *     {
     *       actions: ["s3:*"],
     *       resources: ["arn:aws:s3:::my-bucket/*"]
     *     },
     *   ]
     * }
     * ```
     *
     * Grant permissions to access all resources.
     *
     * ```js
     * {
     *   permissions: [
     *     {
     *       actions: ["*"],
     *       resources: ["*"]
     *     },
     *   ]
     * }
     * ```
     */
    permissions?: SsrSiteArgs["permissions"];
    /**
     * Path to the directory where your Remix app is located.  This path is relative to your `sst.config.ts`.
     *
     * By default it assumes your Remix app is in the root of your SST app.
     * @default `"."`
     *
     * @example
     *
     * If your Remix app is in a package in your monorepo.
     *
     * ```js
     * {
     *   path: "packages/web"
     * }
     * ```
     */
    path?: SsrSiteArgs["path"];
    /**
     * [Link resources](/docs/linking/) to your Remix app. This will:
     *
     * 1. Grant the permissions needed to access the resources.
     * 2. Allow you to access it in your site using the [SDK](/docs/reference/sdk/).
     *
     * @example
     *
     * Takes a list of resources to link to the function.
     *
     * ```js
     * {
     *   link: [bucket, stripeKey]
     * }
     * ```
     */
    link?: SsrSiteArgs["link"];
    /**
     * Configure how the CloudFront cache invalidations are handled. This is run after your Remix app has been deployed.
     * :::tip
     * You get 1000 free invalidations per month. After that you pay $0.005 per invalidation path. [Read more here](https://aws.amazon.com/cloudfront/pricing/).
     * :::
     * @default `{paths: "all", wait: false}`
     * @example
     * Wait for all paths to be invalidated.
     * ```js
     * {
     *   invalidation: {
     *     paths: "all",
     *     wait: true
     *   }
     * }
     * ```
     */
    invalidation?: SsrSiteArgs["invalidation"];
    /**
     * Set [environment variables](https://remix.run/docs/en/main/guides/envvars) in your Remix app. These are made available:
     *
     * 1. In `remix build`, they are loaded into `process.env`.
     * 2. Locally while running through `sst dev`.
     *
     * :::tip
     * You can also `link` resources to your Remix app and access them in a type-safe way with the [SDK](/docs/reference/sdk/). We recommend linking since it's more secure.
     * :::
     *
     * @example
     * ```js
     * {
     *   environment: {
     *     API_URL: api.url,
     *     STRIPE_PUBLISHABLE_KEY: "pk_test_123"
     *   }
     * }
     * ```
     */
    environment?: SsrSiteArgs["environment"];
    /**
     * Set a custom domain for your Remix app.
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
     *   domain: "example.com"
     * }
     * ```
     *
     * For domains hosted on Cloudflare.
     *
     * ```js
     * {
     *   domain: {
     *     name: "example.com",
     *     dns: sst.cloudflare.dns()
     *   }
     * }
     * ```
     *
     * Specify a `www.` version of the custom domain.
     *
     * ```js
     * {
     *   domain: {
     *     name: "domain.com",
     *     redirects: ["www.domain.com"]
     *   }
     * }
     * ```
     */
    domain?: SsrSiteArgs["domain"];
    /**
     * Serve your Remix app through a `Router` instead of a standalone CloudFront
     * distribution.
     *
     * By default, this component creates a new CloudFront distribution. But you might
     * want to serve it through the distribution of your `Router` as a:
     *
     * - A path like `/docs`
     * - A subdomain like `docs.example.com`
     * - Or a combined pattern like `dev.example.com/docs`
     *
     * @example
     *
     * To serve your Remix app **from a path**, you'll need to configure the root domain
     * in your `Router` component.
     *
     * ```ts title="sst.config.ts" {2}
     * const router = new sst.aws.Router("Router", {
     *   domain: "example.com"
     * });
     * ```
     *
     * Now set the `router` and the `path`.
     *
     * ```ts {3,4}
     * {
     *   router: {
     *     instance: router,
     *     path: "/docs"
     *   }
     * }
     * ```
     *
     * You also need to set the `base` in your `vite.config.ts`.
     *
     * :::caution
     * If routing to a path, you need to set that as the base path in your Remix
     * app as well.
     * :::
     *
     * ```js title="vite.config.ts" {3}
     * export default defineConfig({
     *   plugins: [...],
     *   base: "/docs"
     * });
     * ```
     *
     * To serve your Remix app **from a subdomain**, you'll need to configure the
     * domain in your `Router` component to match both the root and the subdomain.
     *
     * ```ts title="sst.config.ts" {3,4}
     * const router = new sst.aws.Router("Router", {
     *   domain: {
     *     name: "example.com",
     *     aliases: ["*.example.com"]
     *   }
     * });
     * ```
     *
     * Now set the `domain` in the `router` prop.
     *
     * ```ts {4}
     * {
     *   router: {
     *     instance: router,
     *     domain: "docs.example.com"
     *   }
     * }
     * ```
     *
     * Finally, to serve your Remix app **from a combined pattern** like
     * `dev.example.com/docs`, you'll need to configure the domain in your `Router` to
     * match the subdomain.
     *
     * ```ts title="sst.config.ts" {3,4}
     * const router = new sst.aws.Router("Router", {
     *   domain: {
     *     name: "example.com",
     *     aliases: ["*.example.com"]
     *   }
     * });
     * ```
     *
     * And set the `domain` and the `path`.
     *
     * ```ts {4,5}
     * {
     *   router: {
     *     instance: router,
     *     domain: "dev.example.com",
     *     path: "/docs"
     *   }
     * }
     * ```
     *
     * Also, make sure to set this as the `base` in your `vite.config.ts`, like
     * above.
     */
    router?: SsrSiteArgs["router"];
    /**
     * The command used internally to build your Remix app.
     *
     * @default `"npm run build"`
     *
     * @example
     *
     * If you want to use a different build command.
     * ```js
     * {
     *   buildCommand: "yarn build"
     * }
     * ```
     */
    buildCommand?: SsrSiteArgs["buildCommand"];
    /**
     * The directory where the build output is located. This should match the value of
     * `buildDirectory` in the Remix plugin section of your Vite config.
     *
     * @default `"build"`
     */
    buildDirectory?: Input<string>;
    /**
     * Configure how the Remix app assets are uploaded to S3.
     *
     * By default, this is set to the following. Read more about these options below.
     * ```js
     * {
     *   assets: {
     *     textEncoding: "utf-8",
     *     versionedFilesCacheHeader: "public,max-age=31536000,immutable",
     *     nonVersionedFilesCacheHeader: "public,max-age=0,s-maxage=86400,stale-while-revalidate=8640"
     *   }
     * }
     * ```
     */
    assets?: SsrSiteArgs["assets"];
    /**
     * Configure the Remix app to use an existing CloudFront cache policy.
     *
     * :::note
     * CloudFront has a limit of 20 cache policies per account, though you can request a limit
     * increase.
     * :::
     *
     * By default, a new cache policy is created for it. This allows you to reuse an existing
     * policy instead of creating a new one.
     *
     * @default A new cache policy is created
     *
     * @example
     * ```js
     * {
     *   cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6"
     * }
     * ```
     */
    cachePolicy?: SsrSiteArgs["cachePolicy"];
}
/**
 * The `Remix` component lets you deploy a [Remix](https://remix.run) app to AWS.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a Remix app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.Remix("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the Remix app in the `my-remix-app/` directory.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Remix("MyWeb", {
 *   path: "my-remix-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your Remix app.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Remix("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4} title="sst.config.ts"
 * new sst.aws.Remix("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your Remix app. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Remix("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your Remix app.
 *
 * ```ts title="app/root.tsx"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export declare class Remix extends SsrSite {
    constructor(name: string, args?: RemixArgs, opts?: ComponentResourceOptions);
    protected normalizeBuildCommand(): void;
    protected buildPlan(outputPath: Output<string>, _name: string, args: RemixArgs): Output<Plan>;
    /**
     * The URL of the Remix app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url(): Output<string>;
}
