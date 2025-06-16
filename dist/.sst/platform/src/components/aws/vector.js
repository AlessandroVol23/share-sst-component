import path from "path";
import { Component, transform } from "../component.js";
import { Postgres } from "./postgres-v1.js";
import { VectorTable } from "./providers/vector-table.js";
import { Function } from "./function.js";
import { permission } from "./permission.js";
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
export class Vector extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const parent = this;
        const tableName = normalizeTableName();
        let postgres;
        if (args && "ref" in args) {
            const ref = args;
            postgres = ref.postgres;
        }
        else {
            postgres = createDB();
            createDBTable();
        }
        const queryHandler = createQueryHandler();
        const putHandler = createPutHandler();
        const removeHandler = createRemoveHandler();
        this.postgres = postgres;
        this.queryHandler = queryHandler;
        this.putHandler = putHandler;
        this.removeHandler = removeHandler;
        function normalizeTableName() {
            return "embeddings";
        }
        function createDB() {
            return new Postgres(...transform(args?.transform?.postgres, `${name}Database`, { vpc: "default" }, { parent }));
        }
        function createDBTable() {
            new VectorTable(`${name}Table`, {
                clusterArn: postgres.nodes.cluster.arn,
                secretArn: postgres.nodes.cluster.masterUserSecrets[0].secretArn,
                databaseName: postgres.database,
                tableName,
                dimension: args.dimension,
            }, { parent, dependsOn: postgres.nodes.instance });
        }
        function createQueryHandler() {
            return new Function(`${name}Query`, {
                description: `${name} query handler`,
                bundle: useBundlePath(),
                handler: "index.query",
                environment: useHandlerEnvironment(),
                permissions: useHandlerPermissions(),
                dev: false,
            }, { parent });
        }
        function createPutHandler() {
            return new Function(`${name}Put`, {
                description: `${name} put handler`,
                bundle: useBundlePath(),
                handler: "index.put",
                environment: useHandlerEnvironment(),
                permissions: useHandlerPermissions(),
                dev: false,
            }, { parent });
        }
        function createRemoveHandler() {
            return new Function(`${name}Remove`, {
                description: `${name} remove handler`,
                bundle: useBundlePath(),
                handler: "index.remove",
                environment: useHandlerEnvironment(),
                permissions: useHandlerPermissions(),
                dev: false,
            }, { parent });
        }
        function useBundlePath() {
            return path.join($cli.paths.platform, "dist", "vector-handler");
        }
        function useHandlerEnvironment() {
            return {
                CLUSTER_ARN: postgres.nodes.cluster.arn,
                SECRET_ARN: postgres.nodes.cluster.masterUserSecrets[0].secretArn,
                DATABASE_NAME: postgres.database,
                TABLE_NAME: tableName,
            };
        }
        function useHandlerPermissions() {
            return [
                {
                    actions: ["secretsmanager:GetSecretValue"],
                    resources: [postgres.nodes.cluster.masterUserSecrets[0].secretArn],
                },
                {
                    actions: ["rds-data:ExecuteStatement"],
                    resources: [postgres.nodes.cluster.arn],
                },
            ];
        }
    }
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
    static get(name, clusterID) {
        const postgres = Postgres.get(`${name}Database`, clusterID);
        return new Vector(name, {
            ref: true,
            postgres,
        });
    }
    /**
     * The ID of the RDS Postgres Cluster.
     */
    get clusterID() {
        return this.postgres.nodes.cluster.id;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Postgres database.
             */
            postgres: this.postgres,
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                /** @internal */
                queryFunction: this.queryHandler.name,
                /** @internal */
                putFunction: this.putHandler.name,
                /** @internal */
                removeFunction: this.removeHandler.name,
            },
            include: [
                permission({
                    actions: ["lambda:InvokeFunction"],
                    resources: [
                        this.queryHandler.nodes.function.arn,
                        this.putHandler.nodes.function.arn,
                        this.removeHandler.nodes.function.arn,
                    ],
                }),
            ],
        };
    }
}
const __pulumiType = "sst:aws:Vector";
// @ts-expect-error
Vector.__pulumiType = __pulumiType;
