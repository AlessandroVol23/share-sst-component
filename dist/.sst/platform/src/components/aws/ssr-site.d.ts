import type { Loader } from "esbuild";
import { Output, Unwrap, ComponentResourceOptions } from "@pulumi/pulumi";
import { Cdn, CdnArgs } from "./cdn.js";
import { Function, FunctionArgs } from "./function.js";
import { Bucket, BucketArgs } from "./bucket.js";
import { Input } from "../input.js";
import { Component, Prettify, type Transform } from "../component.js";
import { BaseSiteFileOptions } from "../base/base-site.js";
import { BaseSsrSiteArgs } from "../base/base-ssr-site.js";
import { Link } from "../link.js";
import { RouterRouteArgsDeprecated, RouterRouteArgs } from "./router.js";
export type Plan = {
    base?: string;
    server?: Unwrap<FunctionArgs>;
    imageOptimizer?: {
        function: Unwrap<FunctionArgs>;
        prefix: string;
    };
    assets: {
        from: string;
        to: string;
        cached: boolean;
        versionedSubDir?: string;
        deepRoute?: string;
    }[];
    isrCache?: {
        from: string;
        to: string;
    };
    custom404?: string;
    buildId?: string;
};
export interface SsrSiteArgs extends BaseSsrSiteArgs {
    domain?: CdnArgs["domain"];
    /**
     * @deprecated Use `router` instead.
     */
    route?: Prettify<RouterRouteArgsDeprecated>;
    router?: Prettify<RouterRouteArgs>;
    cachePolicy?: Input<string>;
    invalidation?: Input<false | {
        /**
         * Configure if `sst deploy` should wait for the CloudFront cache invalidation to finish.
         *
         * :::tip
         * For non-prod environments it might make sense to pass in `false`.
         * :::
         *
         * Waiting for this process to finish ensures that new content will be available after the deploy finishes. However, this process can sometimes take more than 5 mins.
         * @default `false`
         * @example
         * ```js
         * {
         *   invalidation: {
         *     wait: true
         *   }
         * }
         * ```
         */
        wait?: Input<boolean>;
        /**
         * The paths to invalidate.
         *
         * You can either pass in an array of glob patterns to invalidate specific files. Or you can use one of these built-in options:
         * - `all`: All files will be invalidated when any file changes
         * - `versioned`: Only versioned files will be invalidated when versioned files change
         *
         * :::note
         * Each glob pattern counts as a single invalidation. Whereas, invalidating
         * `/*` counts as a single invalidation.
         * :::
         * @default `"all"`
         * @example
         * Invalidate the `index.html` and all files under the `products/` route.
         * ```js
         * {
         *   invalidation: {
         *     paths: ["/index.html", "/products/*"]
         *   }
         * }
         * ```
         * This counts as two invalidations.
         */
        paths?: Input<"all" | "versioned" | string[]>;
    }>;
    /**
     * Regions that the server function will be deployed to.
     *
     * By default, the server function is deployed to a single region, this is the
     * default region of your SST app.
     *
     * :::note
     * This does not use Lambda@Edge, it deploys multiple Lambda functions instead.
     * :::
     *
     * To deploy it to multiple regions, you can pass in a list of regions. And
     * any requests made will be routed to the nearest region based on the user's
     * location.
     *
     * @default The default region of the SST app
     *
     * @example
     * ```js
     * {
     *   regions: ["us-east-1", "eu-west-1"]
     * }
     * ```
     */
    regions?: Input<string[]>;
    permissions?: FunctionArgs["permissions"];
    /**
     * The number of instances of the [server function](#nodes-server) to keep warm. This is useful for cases where you are experiencing long cold starts. The default is to not keep any instances warm.
     *
     * This works by starting a serverless cron job to make _n_ concurrent requests to the server function every few minutes. Where _n_ is the number of instances to keep warm.
     *
     * @default `0`
     */
    warm?: Input<number>;
    /**
     * Configure the Lambda function used for server.
     * @default `{architecture: "x86_64", memory: "1024 MB"}`
     */
    server?: {
        /**
         * The amount of memory allocated to the server function.
         * Takes values between 128 MB and 10240 MB in 1 MB increments.
         *
         * @default `"1024 MB"`
         * @example
         * ```js
         * {
         *   server: {
         *     memory: "2048 MB"
         *   }
         * }
         * ```
         */
        memory?: FunctionArgs["memory"];
        /**
         * The runtime environment for the server function.
         *
         * @default `"nodejs20.x"`
         * @example
         * ```js
         * {
         *   server: {
         *     runtime: "nodejs22.x"
         *   }
         * }
         * ```
         */
        runtime?: Input<"nodejs18.x" | "nodejs20.x" | "nodejs22.x">;
        /**
         * The maximum amount of time the server function can run.
         *
         * While Lambda supports timeouts up to 900 seconds, your requests are served
         * through AWS CloudFront. And it has a default limit of 60 seconds.
         *
         * If you set a timeout that's longer than 60 seconds, this component will
         * check if your account can allow for that timeout. If not, it'll throw an
         * error.
         *
         * :::tip
         * If you need a timeout longer than 60 seconds, you'll need to request a
         * limit increase.
         * :::
         *
         * You can increase this to 180 seconds for your account by contacting AWS
         * Support and [requesting a limit increase](https://console.aws.amazon.com/support/home#/case/create?issueType=service-limit-increase).
         *
         * @default `"20 seconds"`
         * @example
         * ```js
         * {
         *   server: {
         *     timeout: "50 seconds"
         *   }
         * }
         * ```
         *
         * If you need a timeout longer than what CloudFront supports, we recommend
         * using a separate Lambda `Function` with the `url` enabled instead.
         */
        timeout?: FunctionArgs["timeout"];
        /**
         * The [architecture](https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html)
         * of the server function.
         *
         * @default `"x86_64"`
         * @example
         * ```js
         * {
         *   server: {
         *     architecture: "arm64"
         *   }
         * }
         * ```
         */
        architecture?: FunctionArgs["architecture"];
        /**
         * Dependencies that need to be excluded from the server function package.
         *
         * Certain npm packages cannot be bundled using esbuild. This allows you to exclude them
         * from the bundle. Instead they'll be moved into a `node_modules/` directory in the
         * function package.
         *
         * :::tip
         * If esbuild is giving you an error about a package, try adding it to the `install` list.
         * :::
         *
         * This will allow your functions to be able to use these dependencies when deployed. They
         * just won't be tree shaken. You however still need to have them in your `package.json`.
         *
         * :::caution
         * Packages listed here still need to be in your `package.json`.
         * :::
         *
         * Esbuild will ignore them while traversing the imports in your code. So these are the
         * **package names as seen in the imports**. It also works on packages that are not directly
         * imported by your code.
         *
         * @example
         * ```js
         * {
         *   server: {
         *     install: ["sharp"]
         *   }
         * }
         * ```
         */
        install?: Input<string[]>;
        /**
         * Configure additional esbuild loaders for other file extensions. This is useful
         * when your code is importing non-JS files like `.png`, `.css`, etc.
         *
         * @example
         * ```js
         * {
         *   server: {
         *     loader: {
         *      ".png": "file"
         *     }
         *   }
         * }
         * ```
         */
        loader?: Input<Record<string, Loader>>;
        /**
         * A list of Lambda layer ARNs to add to the server function.
         *
         * @example
         * ```js
         * {
         *   server: {
         *     layers: ["arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1"]
         *   }
         * }
         * ```
         */
        layers?: Input<Input<string>[]>;
        /**
         * @deprecated The `server.edge` prop has been moved to the top level `edge` prop on the component.
         */
        edge?: Input<{
            viewerRequest?: Input<{
                injection: Input<string>;
                kvStore?: Input<string>;
                kvStores?: Input<Input<string>[]>;
            }>;
            viewerResponse?: Input<{
                injection: Input<string>;
                kvStore?: Input<string>;
                kvStores?: Input<Input<string>[]>;
            }>;
        }>;
    };
    /**
     * Configure CloudFront Functions to customize the behavior of HTTP requests and responses at the edge.
     */
    edge?: Input<{
        /**
         * Configure the viewer request function.
         *
         * The viewer request function can be used to modify incoming requests before they
         * reach your origin server. For example, you can redirect users, rewrite URLs,
         * or add headers.
         */
        viewerRequest?: Input<{
            /**
             * The code to inject into the viewer request function.
             *
             * By default, a viewer request function is created to:
             * - Disable CloudFront default URL if custom domain is set
             * - Add the `x-forwarded-host` header
             * - Route assets requests to S3 (static files stored in the bucket)
             * - Route server requests to server functions (dynamic rendering)
             *
             * The function manages routing by:
             * 1. First checking if the requested path exists in S3 (with variations like adding index.html)
             * 2. Serving a custom 404 page from S3 if configured and the path isn't found
             * 3. Routing image optimization requests to the image optimizer function
             * 4. Routing all other requests to the nearest server function
             *
             * The given code will be injected at the beginning of this function.
             *
             * ```js
             * async function handler(event) {
             *   // User injected code
             *
             *   // Default behavior code
             *
             *   return event.request;
             * }
             * ```
             *
             * @example
             * To add a custom header to all requests.
             *
             * ```js
             * {
             *   edge: {
             *     viewerRequest: {
             *       injection: `event.request.headers["x-foo"] = "bar";`
             *     }
             *   }
             * }
             * ```
             *
             * You can use this to add basic auth, [check out an example](/docs/examples/#aws-nextjs-basic-auth).
             */
            injection: Input<string>;
            /**
             * The KV store to associate with the viewer request function.
             *
             * @example
             * ```js
             * {
             *   edge: {
             *     viewerRequest: {
             *       kvStore: "arn:aws:cloudfront::123456789012:key-value-store/my-store"
             *     }
             *   }
             * }
             * ```
             */
            kvStore?: Input<string>;
        }>;
        /**
         * Configure the viewer response function.
         *
         * The viewer response function can be used to modify outgoing responses before they are
         * sent to the client. For example, you can add security headers or change the response
         * status code.
         *
         * By default, no viewer response function is set. A new function will be created
         * with the provided code.
         */
        viewerResponse?: Input<{
            /**
             * The code to inject into the viewer response function.
             *
             * ```js
             * async function handler(event) {
             *   // User injected code
             *
             *   return event.response;
             * }
             * ```
             *
             * @example
             * To add a custom header to all responses.
             *
             * ```js
             * {
             *   edge: {
             *     viewerResponse: {
             *       injection: `event.response.headers["x-foo"] = {value: "bar"};`
             *     }
             *   }
             * }
             * ```
             */
            injection: Input<string>;
            /**
             * The KV store to associate with the viewer response function.
             *
             * @example
             * ```js
             * {
             *   edge: {
             *     viewerResponse: {
             *       kvStore: "arn:aws:cloudfront::123456789012:key-value-store/my-store"
             *     }
             *   }
             * }
             * ```
             */
            kvStore?: Input<string>;
        }>;
    }>;
    /**
     * Configure the server function to connect to private subnets in a virtual private cloud or VPC. This allows it to access private resources.
     *
     * @example
     * Create a `Vpc` component.
     *
     * ```js title="sst.config.ts"
     * const myVpc = new sst.aws.Vpc("MyVpc");
     * ```
     *
     * Or reference an existing VPC.
     *
     * ```js title="sst.config.ts"
     * const myVpc = sst.aws.Vpc.get("MyVpc", {
     *   id: "vpc-12345678901234567"
     * });
     * ```
     *
     * And pass it in.
     *
     * ```js
     * {
     *   vpc: myVpc
     * }
     * ```
     */
    vpc?: FunctionArgs["vpc"];
    assets?: Input<{
        /**
         * Character encoding for text based assets, like HTML, CSS, JS. This is
         * used to set the `Content-Type` header when these files are served out.
         *
         * If set to `"none"`, then no charset will be returned in header.
         * @default `"utf-8"`
         * @example
         * ```js
         * {
         *   assets: {
         *     textEncoding: "iso-8859-1"
         *   }
         * }
         * ```
         */
        textEncoding?: Input<"utf-8" | "iso-8859-1" | "windows-1252" | "ascii" | "none">;
        /**
         * The `Cache-Control` header used for versioned files, like `main-1234.css`. This is
         * used by both CloudFront and the browser cache.
         *
         * The default `max-age` is set to 1 year.
         * @default `"public,max-age=31536000,immutable"`
         * @example
         * ```js
         * {
         *   assets: {
         *     versionedFilesCacheHeader: "public,max-age=31536000,immutable"
         *   }
         * }
         * ```
         */
        versionedFilesCacheHeader?: Input<string>;
        /**
         * The `Cache-Control` header used for non-versioned files, like `index.html`. This is used by both CloudFront and the browser cache.
         *
         * The default is set to not cache on browsers, and cache for 1 day on CloudFront.
         * @default `"public,max-age=0,s-maxage=86400,stale-while-revalidate=8640"`
         * @example
         * ```js
         * {
         *   assets: {
         *     nonVersionedFilesCacheHeader: "public,max-age=0,no-cache"
         *   }
         * }
         * ```
         */
        nonVersionedFilesCacheHeader?: Input<string>;
        /**
         * Specify the `Content-Type` and `Cache-Control` headers for specific files. This allows
         * you to override the default behavior for specific files using glob patterns.
         *
         * @example
         * Apply `Cache-Control` and `Content-Type` to all zip files.
         * ```js
         * {
         *   assets: {
         *     fileOptions: [
         *       {
         *         files: "**\/*.zip",
         *         contentType: "application/zip",
         *         cacheControl: "private,no-cache,no-store,must-revalidate"
         *       }
         *     ]
         *   }
         * }
         * ```
         * Apply `Cache-Control` to all CSS and JS files except for CSS files with `index-`
         * prefix in the `main/` directory.
         * ```js
         * {
         *   assets: {
         *     fileOptions: [
         *       {
         *         files: ["**\/*.css", "**\/*.js"],
         *         ignore: "main\/index-*.css",
         *         cacheControl: "private,no-cache,no-store,must-revalidate"
         *       }
         *     ]
         *   }
         * }
         * ```
         */
        fileOptions?: Input<Prettify<BaseSiteFileOptions>[]>;
        /**
         * Configure if files from previous deployments should be purged from the bucket.
         * @default `true`
         * @example
         * ```js
         * {
         *   assets: {
         *     purge: false
         *   }
         * }
         * ```
         */
        purge?: Input<boolean>;
    }>;
    /**
     * @deprecated The `route` prop is now the recommended way to use the `Router` component
     * to serve your site. Setting `route` will not create a standalone CloudFront
     * distribution.
     */
    cdn?: Input<boolean>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Bucket resource used for uploading the assets.
         */
        assets?: Transform<BucketArgs>;
        /**
         * Transform the server Function resource.
         */
        server?: Transform<FunctionArgs>;
        /**
         * Transform the CloudFront CDN resource.
         */
        cdn?: Transform<CdnArgs>;
    };
}
export declare abstract class SsrSite extends Component implements Link.Linkable {
    private cdn?;
    private bucket?;
    private server?;
    private devUrl?;
    private prodUrl?;
    protected abstract normalizeBuildCommand(args: SsrSiteArgs): Output<string> | void;
    protected abstract buildPlan(outputPath: Output<string>, name: string, args: SsrSiteArgs, { bucket }: {
        bucket: Bucket;
    }): Output<Plan>;
    constructor(type: string, name: string, args?: SsrSiteArgs, opts?: ComponentResourceOptions);
    /**
     * The URL of the Astro site.
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
         * The AWS Lambda server function that renders the site.
         */
        server: Output<Function> | undefined;
        /**
         * The Amazon S3 Bucket that stores the assets.
         */
        assets: Bucket | undefined;
        /**
         * The Amazon CloudFront CDN that serves the site.
         */
        cdn: Cdn | undefined;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            url: Output<string>;
        };
    };
}
