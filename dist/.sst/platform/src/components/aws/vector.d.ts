import { ComponentResourceOptions } from "@pulumi/pulumi";
import { Component, Transform } from "../component.js";
import { Postgres, PostgresArgs } from "./postgres-v1.js";
import { Link } from "../link.js";
import { Input } from "../input.js";
export interface VectorArgs {
    /**
     * The dimension size of each vector.
     *
     * The maximum supported dimension is 2000. To store vectors with greater dimension,
     * use dimensionality reduction to reduce the dimension to 2000 or less. OpenAI supports
     * [dimensionality reduction](https://platform.openai.com/docs/api-reference/embeddings/create#embeddings-create-dimensions) automatically when generating embeddings.
     *
     * :::caution
     * Changing the dimension will cause the data to be cleared.
     * :::
     *
     * @example
     * ```js
     * {
     *   dimension: 1536
     * }
     * ```
     */
    dimension: Input<number>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Postgres component.
         */
        postgres?: Transform<PostgresArgs>;
    };
}
/**
 * The `Vector` component lets you store and retrieve vector data in your app.
 *
 * - It uses a vector database powered by [RDS Postgres Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html).
 * - Provides a [SDK](/docs/reference/sdk/) to query, put, and remove the vector data.
 *
 * @example
 *
 * #### Create the database
 *
 * ```ts title="sst.config.ts"
 * const vector = new sst.aws.Vector("MyVectorDB", {
 *   dimension: 1536
 * });
 * ```
 *
 * #### Link to a resource
 *
 * You can link it to other resources, like a function or your Next.js app.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [vector]
 * });
 * ```
 *
 * Once linked, you can query it in your function code using the [SDK](/docs/reference/sdk/).
 *
 * ```ts title="app/page.tsx"
 * import { VectorClient } from "sst";
 *
 * await VectorClient("MyVectorDB").query({
 *   vector: [32.4, 6.55, 11.2, 10.3, 87.9]
 * });
 * ```
 */
export declare class Vector extends Component implements Link.Linkable {
    private postgres;
    private queryHandler;
    private putHandler;
    private removeHandler;
    constructor(name: string, args: VectorArgs, opts?: ComponentResourceOptions);
    /**
     * Reference an existing Vector database with the given name. This is useful when you
     * create a Vector database in one stage and want to share it in another. It avoids having to
     * create a new Vector database in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share Vector databases across stages.
     * :::
     *
     * @param name The name of the component.
     * @param clusterID The RDS cluster id of the existing Vector database.
     *
     * @example
     * Imagine you create a vector database  in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new database, you want to share the same database from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const vector = $app.stage === "frank"
     *   ? sst.aws.Vector.get("MyVectorDB", "app-dev-myvectordb")
     *   : new sst.aws.Vector("MyVectorDB", {
     *       dimension: 1536
     *     });
     * ```
     *
     * Here `app-dev-myvectordb` is the ID of the underlying Postgres cluster created in the `dev` stage.
     * You can find this by outputting the cluster ID in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   cluster: vector.clusterID
     * };
     * ```
     *
     * :::note
     * The Vector component creates a Postgres cluster and lambda functions for interfacing with the VectorDB.
     * The `static get` method only shares the underlying Postgres cluster. Each stage will have its own
     * lambda functions.
     * :::
     */
    static get(name: string, clusterID: Input<string>): Vector;
    /**
     * The ID of the RDS Postgres Cluster.
     */
    get clusterID(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Postgres database.
         */
        postgres: Postgres;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            /** @internal */
            queryFunction: import("@pulumi/pulumi").Output<string>;
            /** @internal */
            putFunction: import("@pulumi/pulumi").Output<string>;
            /** @internal */
            removeFunction: import("@pulumi/pulumi").Output<string>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
}
