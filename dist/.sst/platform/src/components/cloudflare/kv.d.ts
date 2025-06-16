import { ComponentResourceOptions } from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { Component, Transform } from "../component";
import { Link } from "../link";
export interface KvArgs {
    /**
     * [Transform](/docs/components/#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the R2 KV namespace resource.
         */
        namespace?: Transform<cloudflare.WorkersKvNamespaceArgs>;
    };
}
/**
 * The `Kv` component lets you add a [Cloudflare KV storage namespace](https://developers.cloudflare.com/kv/) to
 * your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
 * const storage = new sst.cloudflare.Kv("MyStorage");
 * ```
 *
 * #### Link to a worker
 *
 * You can link KV to a worker.
 *
 * ```ts {3} title="sst.config.ts"
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "./index.ts",
 *   link: [storage],
 *   url: true
 * });
 * ```
 *
 * Once linked, you can use the SDK to interact with the bucket.
 *
 * ```ts title="index.ts" {3}
 * import { Resource } from "sst";
 *
 * await Resource.MyStorage.get("someKey");
 * ```
 */
export declare class Kv extends Component implements Link.Linkable {
    private namespace;
    constructor(name: string, args?: KvArgs, opts?: ComponentResourceOptions);
    /**
     * When you link a KV storage, the storage will be available to the worker and you can
     * interact with it using its [API methods](https://developers.cloudflare.com/kv/api/).
     *
     * @example
     * ```ts title="index.ts" {3}
     * import { Resource } from "sst";
     *
     * await Resource.MyStorage.get("someKey");
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
     * The generated ID of the KV namespace.
     */
    get id(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Cloudflare KV namespace.
         */
        namespace: import("@pulumi/cloudflare/workersKvNamespace").WorkersKvNamespace;
    };
}
