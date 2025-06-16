import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Plan, SsrSite, SsrSiteArgs } from "./ssr-site.js";
export interface AstroArgs extends SsrSiteArgs {
    /**
     * Configure how this component works in `sst dev`.
     *
     * :::note
     * In `sst dev` your Astro site is run in dev mode; it's not deployed.
     * :::
     *
     * Instead of deploying your Astro site, this starts it in dev mode. It's run
     * as a separate process in the `sst dev` multiplexer. Read more about
     * [`sst dev`](/docs/reference/cli/#dev).
     *
     * To disable dev mode, pass in `false`.
     */
    dev?: SsrSiteArgs["dev"];
    /**
     * Permissions and the resources that the [server function](#nodes-server) in your Astro site needs to access. These permissions are used to create the function's IAM role.
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
     *     }
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
     *     }
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
     *     }
     *   ]
     * }
     * ```
     */
    permissions?: SsrSiteArgs["permissions"];
    /**
     * Path to the directory where your Astro site is located.  This path is relative to your `sst.config.ts`.
     *
     * By default it assumes your Astro site is in the root of your SST app.
     * @default `"."`
     *
     * @example
     *
     * If your Astro site is in a package in your monorepo.
     *
     * ```js
     * {
     *   path: "packages/web"
     * }
     * ```
     */
    path?: SsrSiteArgs["path"];
    /**
     * [Link resources](/docs/linking/) to your Astro site. This will:
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
     * Configure how the CloudFront cache invalidations are handled. This is run after your Astro site has been deployed.
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
     * Set [environment variables](https://docs.astro.build/en/guides/environment-variables/) in your Astro site. These are made available:
     *
     * 1. In `astro build`, they are loaded into `import.meta.env`.
     * 2. Locally while running `astro dev` through `sst dev`.
     *
     * :::tip
     * You can also `link` resources to your Astro site and access them in a type-safe way with the [SDK](/docs/reference/sdk/). We recommend linking since it's more secure.
     * :::
     *
     * Recall that in Astro, you need to prefix your environment variables with `PUBLIC_` to access them on the client-side. [Read more here](https://docs.astro.build/en/guides/environment-variables/).
     *
     * @example
     * ```js
     * {
     *   environment: {
     *     API_URL: api.url,
     *     // Accessible on the client-side
     *     PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123"
     *   }
     * }
     * ```
     */
    environment?: SsrSiteArgs["environment"];
    /**
     * Set a custom domain for your Astro site.
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
     * Serve your Astro site through a `Router` instead of a standalone CloudFront
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
     * To serve your Astro site **from a path**, you'll need to configure the root domain
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
     * You also need to set the
     * [`base`](https://docs.astro.build/en/reference/configuration-reference/#base)
     * in your `astro.config.mjs`.
     *
     * :::caution
     * If routing to a path, you need to set that as the base path in your Astro
     * site as well.
     * :::
     *
     * ```js title="astro.config.mjs" {3}
     * export default defineConfig({
     *   adapter: sst(),
     *   base: "/docs"
     * });
     * ```
     *
     * To serve your Astro site **from a subdomain**, you'll need to configure the
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
     * Finally, to serve your Astro site **from a combined pattern** like
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
     * Also, make sure to set this as the `base` in your `astro.config.mjs`, like
     * above.
     */
    router?: SsrSiteArgs["router"];
    /**
     * The command used internally to build your Astro site.
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
     * Configure how the Astro site assets are uploaded to S3.
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
     * Configure the Astro site to use an existing CloudFront cache policy.
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
 * The `Astro` component lets you deploy an [Astro](https://astro.build) site to AWS.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy the Astro site that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.Astro("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the Astro site in the `my-astro-app/` directory.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Astro("MyWeb", {
 *   path: "my-astro-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your Astro site.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Astro("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4} title="sst.config.ts"
 * new sst.aws.Astro("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your Astro site. This will grant permissions
 * to the resources and allow you to access it in your site.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Astro("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your Astro site.
 *
 * ```astro title="src/pages/index.astro"
 * ---
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ---
 * ```
 */
export declare class Astro extends SsrSite {
    constructor(name: string, args?: AstroArgs, opts?: ComponentResourceOptions);
    protected normalizeBuildCommand(): void;
    protected buildPlan(outputPath: Output<string>): Output<Plan>;
    /**
     * The URL of the Astro site.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url(): Output<string>;
}
