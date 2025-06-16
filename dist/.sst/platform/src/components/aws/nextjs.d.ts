import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Size } from "../size.js";
import { Function } from "./function.js";
import type { Input } from "../input.js";
import { Queue } from "./queue.js";
import { Plan, SsrSite, SsrSiteArgs } from "./ssr-site.js";
import { Bucket } from "./bucket.js";
export interface NextjsArgs extends SsrSiteArgs {
    /**
     * Configure how this component works in `sst dev`.
     *
     * :::note
     * In `sst dev` your Next.js app is run in dev mode; it's not deployed.
     * :::
     *
     * Instead of deploying your Next.js app, this starts it in dev mode. It's run
     * as a separate process in the `sst dev` multiplexer. Read more about
     * [`sst dev`](/docs/reference/cli/#dev).
     *
     * To disable dev mode, pass in `false`.
     */
    dev?: SsrSiteArgs["dev"];
    /**
     * Permissions and the resources that the [server function](#nodes-server) in your Next.js app needs to access. These permissions are used to create the function's IAM role.
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
     * Path to the directory where your Next.js app is located. This path is relative to your `sst.config.ts`.
     *
     * By default this assumes your Next.js app is in the root of your SST app.
     * @default `"."`
     *
     * @example
     *
     * If your Next.js app is in a package in your monorepo.
     *
     * ```js
     * {
     *   path: "packages/web"
     * }
     * ```
     */
    path?: SsrSiteArgs["path"];
    /**
     * [Link resources](/docs/linking/) to your Next.js app. This will:
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
     * Configure how the CloudFront cache invalidations are handled. This is run after your Next.js app has been deployed.
     * :::tip
     * You get 1000 free invalidations per month. After that you pay $0.005 per invalidation path. [Read more here](https://aws.amazon.com/cloudfront/pricing/).
     * :::
     * @default `{paths: "all", wait: false}`
     * @example
     * Turn off invalidations.
     * ```js
     * {
     *   invalidation: false
     * }
     * ```
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
     * The command used internally to build your Next.js app. It uses OpenNext with the `openNextVersion`.
     *
     * @default `"npx --yes open-next@OPEN_NEXT_VERSION build"`
     *
     * @example
     *
     * If you want to use a custom `build` script from your `package.json`. This is useful if you have a custom build process or want to use a different version of OpenNext.
     * OpenNext by default uses the `build` script for building next-js app in your `package.json`. You can customize the build command in OpenNext configuration.
     * ```js
     * {
     *   buildCommand: "npm run build:open-next"
     * }
     * ```
     */
    buildCommand?: SsrSiteArgs["buildCommand"];
    /**
     * Set [environment variables](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables) in your Next.js app. These are made available:
     *
     * 1. In `next build`, they are loaded into `process.env`.
     * 2. Locally while running through `sst dev`.
     *
     * :::tip
     * You can also `link` resources to your Next.js app and access them in a type-safe way with the [SDK](/docs/reference/sdk/). We recommend linking since it's more secure.
     * :::
     *
     * Recall that in Next.js, you need to prefix your environment variables with `NEXT_PUBLIC_` to access these in the browser. [Read more here](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables#bundling-environment-variables-for-the-browser).
     *
     * @example
     * ```js
     * {
     *   environment: {
     *     API_URL: api.url,
     *     // Accessible in the browser
     *     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123"
     *   }
     * }
     * ```
     */
    environment?: SsrSiteArgs["environment"];
    /**
     * Serve your Next.js app through a `Router` instead of a standalone CloudFront
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
     * To serve your Next.js app **from a path**, you'll need to configure the root domain
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
     * You also need to set the [`basePath`](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath)
     * in your `next.config.js`.
     *
     * :::caution
     * If routing to a path, you need to set that as the base path in your Next.js
     * app as well.
     * :::
     *
     * ```js title="next.config.js" {2}
     * export default defineConfig({
     *   basePath: "/docs"
     * });
     * ```
     *
     * To serve your Next.js app **from a subdomain**, you'll need to configure the
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
     * Finally, to serve your Next.js app **from a combined pattern** like
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
     * Also, make sure to set this as the `basePath` in your `next.config.js`, like
     * above.
     */
    router?: SsrSiteArgs["router"];
    /**
     * Set a custom domain for your Next.js app.
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
     * Configure how the Next.js app assets are uploaded to S3.
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
     * Read more about these options below.
     * @default `Object`
     */
    assets?: SsrSiteArgs["assets"];
    /**
     * Configure the [OpenNext](https://opennext.js.org) version used to build the Next.js app.
     *
     * :::note
     * This does not automatically update to the latest OpenNext version. It remains pinned to the version of SST you have.
     * :::
     *
     * By default, this is pinned to the version of OpenNext that was released with the SST version you are using. You can [find this in the source](https://github.com/sst/sst/blob/dev/platform/src/components/aws/nextjs.ts#L30) under `DEFAULT_OPEN_NEXT_VERSION`.
     * OpenNext changed its package name from `open-next` to `@opennextjs/aws` in version `3.1.4`. SST will choose the correct one based on the version you provide.
     *
     * @default The latest version of OpenNext pinned to the version of SST you are using.
     * @example
     * ```js
     * {
     *   openNextVersion: "3.4.1"
     * }
     * ```
     */
    openNextVersion?: Input<string>;
    /**
     * Configure the Lambda function used for image optimization.
     * @default `{memory: "1024 MB"}`
     */
    imageOptimization?: {
        /**
         * The amount of memory allocated to the image optimization function.
         * Takes values between 128 MB and 10240 MB in 1 MB increments.
         *
         * @default `"1536 MB"`
         * @example
         * ```js
         * {
         *   imageOptimization: {
         *     memory: "512 MB"
         *   }
         * }
         * ```
         */
        memory?: Size;
        /**
         * If set to true, a previously computed image will return _304 Not Modified_.
         * This means that image needs to be **immutable**.
         *
         * The etag will be computed based on the image href, format and width and the next
         * BUILD_ID.
         *
         * @default `false`
         * @example
         * ```js
         * {
         *   imageOptimization: {
         *     staticEtag: true,
         *   }
         * }
         * ```
         */
        staticEtag?: boolean;
    };
    /**
     * Configure the Next.js app to use an existing CloudFront cache policy.
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
 * The `Nextjs` component lets you deploy [Next.js](https://nextjs.org) apps on AWS. It uses
 * [OpenNext](https://open-next.js.org) to build your Next.js app, and transforms the build
 * output to a format that can be deployed to AWS.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy the Next.js app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys a Next.js app in the `my-next-app/` directory.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   path: "my-next-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your Next.js app.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4} title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your Next.js app. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your Next.js app.
 *
 * ```ts title="app/page.tsx"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export declare class Nextjs extends SsrSite {
    private revalidationQueue?;
    private revalidationTable?;
    private revalidationFunction?;
    constructor(name: string, args?: NextjsArgs, opts?: ComponentResourceOptions);
    protected normalizeBuildCommand(args: NextjsArgs): Output<string>;
    protected buildPlan(outputPath: Output<string>, name: string, args: NextjsArgs, { bucket }: {
        bucket: Bucket;
    }): Output<Plan>;
    /**
     * The URL of the Next.js app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon SQS queue that triggers the ISR revalidator.
         */
        revalidationQueue: Output<Queue | undefined> | undefined;
        /**
         * The Amazon DynamoDB table that stores the ISR revalidation data.
         */
        revalidationTable: Output<import("@pulumi/aws/dynamodb/table.js").Table | undefined> | undefined;
        /**
         * The Lambda function that processes the ISR revalidation.
         */
        revalidationFunction: Output<Function | undefined> | undefined;
        server: Output<Function> | undefined;
        assets: Bucket | undefined;
        cdn: import("./cdn.js").Cdn | undefined;
    };
}
