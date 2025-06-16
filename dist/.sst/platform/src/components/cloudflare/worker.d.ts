import { ComponentResourceOptions } from "@pulumi/pulumi";
import * as cf from "@pulumi/cloudflare";
import type { Loader, BuildOptions } from "esbuild";
import { Component, Transform } from "../component";
import { Link } from "../link.js";
import type { Input } from "../input.js";
export interface WorkerArgs {
    /**
     * Path to the handler file for the worker.
     *
     * The handler path is relative to the root your repo or the `sst.config.ts`.
     *
     * @example
     *
     * ```js
     * {
     *   handler: "packages/functions/src/worker.ts"
     * }
     * ```
     */
    handler: Input<string>;
    /**
     * Enable a dedicated endpoint for your Worker.
     * @default `false`
     */
    url?: Input<boolean>;
    /**
     * Set a custom domain for your Worker. Supports domains hosted on Cloudflare.
     *
     * :::tip
     * You can migrate an externally hosted domain to Cloudflare by
     * [following this guide](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).
     * :::
     *
     * @example
     *
     * ```js
     * {
     *   domain: "domain.com"
     * }
     * ```
     */
    domain?: Input<string>;
    /**
     * Configure how your function is bundled.
     *
     * SST bundles your worker code using [esbuild](https://esbuild.github.io/). This tree shakes your code to only include what's used.
     */
    build?: Input<{
        /**
         * Configure additional esbuild loaders for other file extensions. This is useful
         * when your code is importing non-JS files like `.png`, `.css`, etc.
         *
         * @example
         * ```js
         * {
         *   build: {
         *     loader: {
         *      ".png": "file"
         *     }
         *   }
         * }
         * ```
         */
        loader?: Input<Record<string, Loader>>;
        /**
         * Use this to insert a string at the beginning of the generated JS file.
         *
         * @example
         * ```js
         * {
         *   build: {
         *     banner: "console.log('Function starting')"
         *   }
         * }
         * ```
         */
        banner?: Input<string>;
        /**
         * This allows you to customize esbuild config that is used.
         *
         * :::tip
         * Check out the _JS tab_ in the code snippets in the esbuild docs for the
         * [`BuildOptions`](https://esbuild.github.io/api/#build).
         * :::
         *
         */
        esbuild?: Input<BuildOptions>;
        /**
         * Disable if the worker code should be minified when bundled.
         *
         * @default `true`
         *
         * @example
         * ```js
         * {
         *   build: {
         *     minify: false
         *   }
         * }
         * ```
         */
        minify?: Input<boolean>;
    }>;
    /**
     * [Link resources](/docs/linking/) to your worker. This will:
     *
     * 1. Handle the credentials needed to access the resources.
     * 2. Allow you to access it in your site using the [SDK](/docs/reference/sdk/).
     *
     * @example
     *
     * Takes a list of components to link to the function.
     *
     * ```js
     * {
     *   link: [bucket, stripeKey]
     * }
     * ```
     */
    link?: Input<any[]>;
    /**
     * Key-value pairs that are set as [Worker environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/).
     *
     * They can be accessed in your worker through `env.<key>`.
     *
     * @example
     *
     * ```js
     * {
     *   environment: {
     *     DEBUG: "true"
     *   }
     * }
     * ```
     */
    environment?: Input<Record<string, Input<string>>>;
    /**
     * Upload [static assets](https://developers.cloudflare.com/workers/static-assets/) as
     * part of the worker.
     *
     * You can directly fetch and serve assets within your Worker code via the [assets
     * binding](https://developers.cloudflare.com/workers/static-assets/binding/#binding).
     *
     * @example
     * ```js
     * {
     *   assets: {
     *     directory: "./dist"
     *   }
     * }
     * ```
     */
    assets?: Input<{
        /**
         * The directory containing the assets.
         */
        directory: Input<string>;
    }>;
    /**
     * [Transform](/docs/components/#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Worker resource.
         */
        worker?: Transform<cf.WorkersScriptArgs>;
    };
    /**
     * @internal
     * Placehodler for future feature.
     */
    dev?: boolean;
    /**
     * @internal
     */
    largePayload?: boolean;
}
/**
 * The `Worker` component lets you create a Cloudflare Worker.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler"
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to the Worker. This will handle the credentials
 * and allow you to access it in your handler.
 *
 * ```ts {5} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler",
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your handler.
 *
 * ```ts title="src/worker.ts" {3}
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 *
 * #### Enable URLs
 *
 * Enable worker URLs to invoke the worker over HTTP.
 *
 * ```ts {3} title="sst.config.ts"
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler",
 *   url: true
 * });
 * ```
 *
 * #### Bundling
 *
 * Customize how SST uses [esbuild](https://esbuild.github.io/) to bundle your worker code with the `build` property.
 *
 * ```ts title="sst.config.ts" {3-5}
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler",
 *   build: {
 *     install: ["pg"]
 *   }
 * });
 * ```
 */
export declare class Worker extends Component implements Link.Linkable {
    private script;
    private workerUrl;
    private workerDomain?;
    constructor(name: string, args: WorkerArgs, opts?: ComponentResourceOptions);
    /**
     * The Worker URL if `url` is enabled.
     */
    get url(): import("@pulumi/pulumi").Output<string | undefined>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Cloudflare Worker script.
         */
        worker: import("@pulumi/cloudflare/workersScript").WorkersScript;
    };
    /**
     * When you link a worker, say WorkerA, to another worker, WorkerB; it automatically creates
     * a service binding between the workers. It allows WorkerA to call WorkerB without going
     * through a publicly-accessible URL.
     *
     * @example
     * ```ts title="index.ts" {3}
     * import { Resource } from "sst";
     *
     * await Resource.WorkerB.fetch(request);
     * ```
     *
     * Read more about [binding Workers](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/).
     *
     * @internal
     */
    getSSTLink(): {
        properties: {
            url: import("@pulumi/pulumi").Output<string | undefined>;
        };
        include: {
            type: "cloudflare.binding";
            binding: "kvNamespaceBindings" | "secretTextBindings" | "serviceBindings" | "plainTextBindings" | "queueBindings" | "r2BucketBindings" | "d1DatabaseBindings";
            properties: {
                namespaceId: Input<string>;
            } | {
                text: Input<string>;
            } | {
                service: Input<string>;
            } | {
                text: Input<string>;
            } | {
                queue: Input<string>;
            } | {
                bucketName: Input<string>;
            } | {
                id: Input<string>;
            };
        }[];
    };
}
