import { ComponentResourceOptions } from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { Component, Transform } from "../component";
import { Link } from "../link.js";
export interface BucketArgs {
    /**
     * [Transform](/docs/components/#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the R2 Bucket resource.
         */
        bucket?: Transform<cloudflare.R2BucketArgs>;
    };
}
/**
 * The `Bucket` component lets you add a [Cloudflare R2 Bucket](https://developers.cloudflare.com/r2/) to
 * your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
 * const bucket = new sst.cloudflare.Bucket("MyBucket");
 * ```
 *
 * #### Link to a worker
 *
 * You can link the bucket to a worker.
 *
 * ```ts {3} title="sst.config.ts"
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "./index.ts",
 *   link: [bucket],
 *   url: true
 * });
 * ```
 *
 * Once linked, you can use the SDK to interact with the bucket.
 *
 * ```ts title="index.ts" {3}
 * import { Resource } from "sst";
 *
 * await Resource.MyBucket.list();
 * ```
 */
export declare class Bucket extends Component implements Link.Linkable {
    private bucket;
    constructor(name: string, args?: BucketArgs, opts?: ComponentResourceOptions);
    /**
     * When you link a bucket to a worker, you can interact with it using these
     * [Bucket methods](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#bucket-method-definitions).
     *
     * @example
     * ```ts title="index.ts" {3}
     * import { Resource } from "sst";
     *
     * await Resource.MyBucket.list();
     * ```
     *
     * @internal
     */
    getSSTLink(): {
        properties: {};
        include: {
            type: "cloudflare.binding";
            binding: "kvNamespaceBindings" | "secretTextBindings" | "serviceBindings" | "plainTextBindings" | "queueBindings" | "r2BucketBindings" | "d1DatabaseBindings";
            properties: {
                namespaceId: import("../input").Input<string>;
            } | {
                text: import("../input").Input<string>;
            } | {
                service: import("../input").Input<string>;
            } | {
                text: import("../input").Input<string>;
            } | {
                queue: import("../input").Input<string>;
            } | {
                bucketName: import("../input").Input<string>;
            } | {
                id: import("../input").Input<string>;
            };
        }[];
    };
    /**
     * The generated name of the R2 Bucket.
     */
    get name(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Cloudflare R2 Bucket.
         */
        bucket: import("@pulumi/cloudflare/r2bucket").R2Bucket;
    };
}
