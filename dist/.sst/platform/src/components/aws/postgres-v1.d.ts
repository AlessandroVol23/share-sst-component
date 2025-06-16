import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component.js";
import { Link } from "../link.js";
import { Input } from "../input.js";
import { rds } from "@pulumi/aws";
type ACU = `${number} ACU`;
export interface PostgresArgs {
    /**
     * The Postgres engine version. Check out the [available versions in your region](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.html#Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.apg).
     * @default `"15.5"`
     * @example
     * ```js
     * {
     *   version: "13.9"
     * }
     * ```
     */
    version?: Input<string>;
    /**
     * Name of a database that is automatically created inside the cluster.
     *
     * The name must begin with a letter and contain only lowercase letters, numbers, or underscores. By default, it takes the name of the app, and replaces the hyphens with underscores.
     *
     * @default Based on the name of the current app
     * @example
     * ```js
     * {
     *   databaseName: "acme"
     * }
     * ```
     */
    databaseName?: Input<string>;
    /**
     * The Aurora Serverless v2 scaling config. By default, the cluster has one DB instance that
     * is used for both writes and reads. The instance can scale from the minimum number of ACUs
     * to the maximum number of ACUs.
     *
     * :::caution
     * Aurora Serverless v2 does not scale down to 0. The minimum cost of a Postgres cluster
     * per month is roughly `0.5 * $0.12 per ACU hour * 24 hrs * 30 days = $43.20`.
     * :::
     *
     * An ACU or Aurora Capacity Unit is a combination of CPU and RAM. The cost of an Aurora Serverless v2 cluster is based on the ACU hours
     * used. Additionally, you are billed for I/O and storage used by the cluster.
     * [Read more here](https://aws.amazon.com/rds/aurora/pricing/).
     *
     * Each ACU is roughly equivalent to 2 GB of memory. So pick the minimum and maximum
     * based on the baseline and peak memory usage of your app.
     *
     * @default `{min: "0.5 ACU", max: "4 ACU"}`
     */
    scaling?: Input<{
        /**
         * The minimum number of ACUs, ranges from 0.5 to 128, in increments of 0.5.
         *
         * For your production workloads, setting a minimum of 0.5 ACUs might not be a great idea due
         * to the following reasons, you can also [read more here](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html#aurora-serverless-v2.setting-capacity.incompatible_parameters).
         * - It takes longer to scale from a low number of ACUs to a much higher number.
         * - Query performance depends on the buffer cache. So if frequently accessed data cannot
         *   fit into the buffer cache, you might see uneven performance.
         * - The max connections for a 0.5 ACU Postgres instance is capped at 2000.
         *
         * @default `0.5 ACU`
         * @example
         * ```js
         * {
         *   scaling: {
         *     min: "2 ACU"
         *   }
         * }
         * ```
         */
        min?: Input<ACU>;
        /**
         * The maximum number of ACUs, ranges from 1 to 128, in increments of 0.5.
         *
         * @default `4 ACU`
         * @example
         * ```js
         * {
         *   scaling: {
         *     max: "128 ACU"
         *   }
         * }
         * ```
         */
        max?: Input<ACU>;
    }>;
    /**
     * The VPC to use for the database cluster.
     *
     * Each AWS account has a default VPC. If `default` is specified, the default VPC is used.
     *
     * :::note
     * The default VPC does not have private subnets and is not recommended for production use.
     * :::
     *
     * @example
     * ```js
     * {
     *   vpc: {
     *     privateSubnets: ["subnet-0db7376a7ad4db5fd ", "subnet-06fc7ee8319b2c0ce"],
     *     securityGroups: ["sg-0399348378a4c256c"],
     *   }
     * }
     * ```
     *
     * Or create a `Vpc` component.
     *
     * ```js
     * const myVpc = new sst.aws.Vpc("MyVpc");
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
    vpc: "default" | Input<{
        /**
         * A list of private subnet IDs in the VPC. The database will be placed in the private
         * subnets.
         */
        privateSubnets: Input<Input<string>[]>;
        /**
         * A list of VPC security group IDs.
         */
        securityGroups: Input<Input<string>[]>;
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the RDS subnet group.
         */
        subnetGroup?: Transform<rds.SubnetGroupArgs>;
        /**
         * Transform the RDS Cluster.
         */
        cluster?: Transform<rds.ClusterArgs>;
        /**
         * Transform the database instance in the RDS Cluster.
         */
        instance?: Transform<rds.ClusterInstanceArgs>;
    };
}
/**
 * The `Postgres` component lets you add a Postgres database to your app using
 * [Amazon Aurora Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html).
 *
 * For existing usage, rename `sst.aws.Postgres` to `sst.aws.Postgres.v1`. For new Postgres, use
 * the latest [`Postgres`](/docs/component/aws/postgres) component instead.
 *
 * :::caution
 * This component has been deprecated.
 * :::
 *
 * What changed:
 * - In this version, the database used AWS RDS Aurora Serverless v2, which supported RDS
 * Data API. This allowed your machine to connect to the database during "sst dev" without
 * the need for a VPN.
 * - In the new version, the database now uses AWS RDS Postgres. The "sst.aws.Vpc" component
 * has been enhanced to set up a secure tunnel, enabling seamlessly connections to the
 * database. Postgres provides greater flexibility and wider feature support while being
 * cheaper to run.
 *
 * :::note
 * Data API for Aurora Postgres Serverless v2 is still being [rolled out in all regions](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.html#Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.apg).
 * :::
 *
 * To connect to your database from your Lambda functions, you can use the
 * [AWS Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html). It
 * does not need a persistent connection, and works over HTTP. You also don't need a VPN to
 * connect to it locally.
 *
 * @example
 *
 * #### Create the database
 *
 * ```js title="sst.config.ts"
 * const vpc = new sst.aws.Vpc("MyVpc");
 * const database = new sst.aws.Postgres.v1("MyDatabase", { vpc });
 * ```
 *
 * #### Change the scaling config
 *
 * ```js title="sst.config.ts"
 * new sst.aws.Postgres.v1("MyDatabase", {
 *   scaling: {
 *     min: "2 ACU",
 *     max: "128 ACU"
 *   },
 *   vpc
 * });
 * ```
 *
 * #### Link to a resource
 *
 * You can link your database to other resources, like a function or your Next.js app.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [database],
 *   vpc
 * });
 * ```
 *
 * Once linked, you can connect to it from your function code.
 *
 * ```ts title="app/page.tsx" {1,6,7,8}
 * import { Resource } from "sst";
 * import { drizzle } from "drizzle-orm/aws-data-api/pg";
 * import { RDSDataClient } from "@aws-sdk/client-rds-data";
 *
 * drizzle(new RDSDataClient({}), {
 *   database: Resource.MyDatabase.database,
 *   secretArn: Resource.MyDatabase.secretArn,
 *   resourceArn: Resource.MyDatabase.clusterArn
 * });
 * ```
 */
export declare class Postgres extends Component implements Link.Linkable {
    private cluster;
    private instance;
    constructor(name: string, args: PostgresArgs, opts?: ComponentResourceOptions);
    private _dbSecret?;
    private get secret();
    /**
     * The ID of the RDS Cluster.
     */
    get clusterID(): Output<string>;
    /**
     * The ARN of the RDS Cluster.
     */
    get clusterArn(): Output<string>;
    /**
     * The ARN of the master user secret.
     */
    get secretArn(): Output<string>;
    /** The username of the master user. */
    get username(): Output<string>;
    /** The password of the master user. */
    get password(): Output<string>;
    /**
     * The name of the database.
     */
    get database(): Output<string>;
    /**
     * The port of the database.
     */
    get port(): import("@pulumi/pulumi").OutputInstance<number>;
    /**
     * The host of the database.
     */
    get host(): Output<string>;
    get nodes(): {
        cluster: import("@pulumi/aws/rds/cluster.js").Cluster;
        instance: import("@pulumi/aws/rds/clusterInstance.js").ClusterInstance;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            clusterArn: Output<string>;
            secretArn: Output<string>;
            database: Output<string>;
            username: Output<string>;
            password: Output<string>;
            port: import("@pulumi/pulumi").OutputInstance<number>;
            host: Output<string>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
    /**
     * Reference an existing Postgres cluster with the given cluster name. This is useful when you
     * create a Postgres cluster in one stage and want to share it in another. It avoids having to
     * create a new Postgres cluster in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share Postgres clusters across stages.
     * :::
     *
     * @param name The name of the component.
     * @param clusterID The id of the existing Postgres cluster.
     *
     * @example
     * Imagine you create a cluster in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new cluster, you want to share the same cluster from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const database = $app.stage === "frank"
     *   ? sst.aws.Postgres.v1.get("MyDatabase", "app-dev-mydatabase")
     *   : new sst.aws.Postgres.v1("MyDatabase");
     * ```
     *
     * Here `app-dev-mydatabase` is the ID of the cluster created in the `dev` stage.
     * You can find this by outputting the cluster ID in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   cluster: database.clusterID
     * };
     * ```
     */
    static get(name: string, clusterID: Input<string>): Postgres;
}
export {};
