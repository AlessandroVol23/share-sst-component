import { ComponentResourceOptions } from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { Component, Transform } from "../component";
import { Link } from "../link";
export interface D1Args {
    /**
     * [Transform](/docs/components/#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the D1 resource.
         */
        database?: Transform<cloudflare.D1DatabaseArgs>;
    };
}
/**
 * The `D1` component lets you add a [Cloudflare D1 database](https://developers.cloudflare.com/d1/) to
 * your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
 * const db = new sst.cloudflare.D1("MyDatabase");
 * ```
 *
 * #### Link to a worker
 *
 * You can link the db to a worker.
 *
 * ```ts {3} title="sst.config.ts"
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "./index.ts",
 *   link: [db],
 *   url: true
 * });
 * ```
 *
 * Once linked, you can use the SDK to interact with the db.
 *
 * ```ts title="index.ts" {1} "Resource.MyDatabase.prepare"
 * import { Resource } from "sst";
 *
 * await Resource.MyDatabase.prepare(
 *   "SELECT id FROM todo ORDER BY id DESC LIMIT 1",
 * ).first();
 * ```
 */
export declare class D1 extends Component implements Link.Linkable {
    private database;
    constructor(name: string, args?: D1Args, opts?: ComponentResourceOptions);
    /**
     * When you link a D1 database, the database will be available to the worker and you can
     * query it using its [API methods](https://developers.cloudflare.com/d1/build-with-d1/d1-client-api/).
     *
     * @example
     * ```ts title="index.ts" {1} "Resource.MyDatabase.prepare"
     * import { Resource } from "sst";
     *
     * await Resource.MyDatabase.prepare(
     *   "SELECT id FROM todo ORDER BY id DESC LIMIT 1",
     * ).first();
     * ```
     *
     * @internal
     */
    getSSTLink(): {
        properties: {
            databaseId: import("@pulumi/pulumi").Output<string>;
        };
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
     * The generated ID of the D1 database.
     */
    get databaseId(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Cloudflare D1 database.
         */
        database: import("@pulumi/cloudflare/d1database").D1Database;
    };
}
