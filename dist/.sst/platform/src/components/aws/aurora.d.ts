import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component.js";
import { Link } from "../link.js";
import { Input } from "../input.js";
import { rds } from "@pulumi/aws";
import { Vpc } from "./vpc.js";
import { DurationHours } from "../duration.js";
type ACU = `${number} ACU`;
export interface AuroraArgs {
    /**
     * The Aurora engine to use.
     *
     * @example
     * ```js
     * {
     *   engine: "postgres"
     * }
     * ```
     */
    engine: Input<"postgres" | "mysql">;
    /**
     * The version of the Aurora engine.
     *
     * The default is `"16.4"` for Postgres and `"3.08.0"` for MySQL.
     *
     * Check out the [available Postgres versions](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.html#Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.apg) and [available MySQL versions](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.html#Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.amy) in your region.
     *
     * :::tip
     * Not all versions support scaling to 0 with auto-pause and resume.
     * :::
     *
     * Auto-pause and resume is only supported in the following versions:
     * - Aurora PostgresSQL 16.3 and higher
     * - Aurora PostgresSQL 15.7 and higher
     * - Aurora PostgresSQL 14.12 and higher
     * - Aurora PostgresSQL 13.15 and higher
     * - Aurora MySQL 3.08.0 and higher
     *
     * @default `"16.4"` for Postgres, `"3.08.0"` for MySQL
     * @example
     * ```js
     * {
     *   version: "16.3"
     * }
     * ```
     */
    version?: Input<string>;
    /**
     * The username of the master user.
     *
     * :::danger
     * Changing the username will cause the database to be destroyed and recreated.
     * :::
     *
     * @default `"postgres"` for Postgres, `"root"` for MySQL
     * @example
     * ```js
     * {
     *   username: "admin"
     * }
     * ```
     */
    username?: Input<string>;
    /**
     * The password of the master user.
     * @default A random password is generated.
     * @example
     * ```js
     * {
     *   password: "Passw0rd!"
     * }
     * ```
     *
     * You can use a [`Secret`](/docs/component/secret) to manage the password.
     *
     * ```js
     * {
     *   password: (new sst.Secret("MyDBPassword")).value
     * }
     * ```
     */
    password?: Input<string>;
    /**
     * Name of a database that is automatically created inside the cluster.
     *
     * The name must begin with a letter and contain only lowercase letters, numbers, or
     * underscores.
     *
     * By default, it takes the name of the app, and replaces the hyphens with underscores.
     *
     * @default Based on the name of the current app
     * @example
     * ```js
     * {
     *   databaseName: "acme"
     * }
     * ```
     */
    database?: Input<string>;
    /**
     * The Aurora Serverless v2 scaling config.
     *
     * By default, the cluster has one DB instance that is used for both writes and reads. The
     * instance can scale from a minimum number of ACUs to the maximum number of ACUs.
     *
     * :::tip
     * Pick the `min` and `max` ACUs based on the baseline and peak memory usage of your app.
     * :::
     *
     * An ACU or _Aurora Capacity Unit_ is roughly equivalent to 2 GB of memory and a corresponding
     * amount of CPU and network resources. So pick the minimum and maximum based on the baseline
     * and peak memory usage of your app.
     *
     * If you set a `min` of 0 ACUs, the database will be paused when there are no active
     * connections in the `pauseAfter` specified time period.
     *
     * This is useful for dev environments since you are not charged when the database is paused.
     * But it's not recommended for production environments because it takes around 15 seconds for
     * the database to resume.
     *
     * @default `{min: "0 ACU", max: "4 ACU"}`
     */
    scaling?: Input<{
        /**
         * The minimum number of ACUs or _Aurora Capacity Units_. Ranges from 0 to 256, in
         * increments of 0.5. Where each ACU is roughly equivalent to 2 GB of memory.
         *
         * If you set this to 0 ACUs, the database will be paused when there are no active
         * connections in the `pauseAfter` specified time period.
         *
         * :::note
         * If you set a `min` ACU to 0, the database will be paused after the `pauseAfter` time
         * period.
         * :::
         *
         * On the next database connection, the database will resume. It takes about 15 seconds for
         * the database to resume.
         *
         * :::tip
         * Avoid setting a low number of `min` ACUs for production workloads.
         * :::
         *
         * For your production workloads, setting a minimum of 0.5 ACUs might not be a great idea
         * because:
         *
         * 1. It takes longer to scale from a low number of ACUs to a much higher number.
         * 2. Query performance depends on the buffer cache. So if frequently accessed data cannot
         *   fit into the buffer cache, you might see uneven performance.
         * 3. The max connections for a 0.5 ACU instance is capped at 2000.
         *
         * You can [read more here](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html#aurora-serverless-v2.setting-capacity.incompatible_parameters).
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
         * The maximum number of ACUs or _Aurora Capacity Units_. Ranges from 1 to 128, in
         * increments of 0.5. Where each ACU is roughly equivalent to 2 GB of memory.
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
        /**
         * The amount of time before the database is paused when there are no active connections.
         * Only applies when the `min` is set to 0 ACUs.
         *
         * :::note
         * This only applies when the `min` is set to 0 ACUs.
         * :::
         *
         * Must be between `"5 minutes"` and `"60 minutes"` or `"1 hour"`. So if the `min` is set
         * to 0 ACUs, by default, the database will be auto-paused after `"5 minutes"`.
         *
         * When the database is paused, you are not charged for the ACUs. On the next database
         * connection, the database will resume. It takes about 15 seconds for the database to
         * resume.
         *
         * :::tip
         * Auto-pause is not recommended for production environments.
         * :::
         *
         * Auto-pause is useful for minimizing costs in the development environments where the
         * database is not used frequently. It's not recommended for production environments.
         *
         * @default `"5 minutes"`
         * @example
         * ```js
         * {
         *   scaling: {
         *     pauseAfter: "20 minutes"
         *   }
         * }
         * ```
         */
        pauseAfter?: Input<DurationHours>;
    }>;
    /**
     * The number of read-only Aurora replicas to create.
     *
     * By default, the cluster has one primary DB instance that is used for both writes and
     * reads. You can add up to 15 read-only replicas to offload the read traffic from the
     * primary instance.
     *
     * @default `0`
     * @example
     * ```js
     * {
     *   replicas: 2
     * }
     * ```
     */
    replicas?: Input<number>;
    /**
     * Enable [RDS Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html)
     * for the database.
     *
     * The RDS Data API provides a secure HTTP endpoint and does not need a persistent connection.
     * You also doesn't need the `sst tunnel` or a VPN to connect to it from your local machine.
     *
     * RDS Data API is [billed per request](#cost). Check out the [RDS Data API
     * pricing](https://aws.amazon.com/rds/aurora/pricing/#Data_API_costs) for more details.
     *
     * @default `false`
     * @example
     * ```js
     * {
     *   dataApi: true
     * }
     * ```
     */
    dataApi?: Input<boolean>;
    /**
     * Enable [RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
     * for the database.
     *
     * Amazon RDS Proxy sits between your application and the database and manages connections to
     * it. It's useful for serverless applications, or Lambda functions where each invocation
     * might create a new connection.
     *
     * There's an [extra cost](#cost) attached to enabling this. Check out the [RDS Proxy
     * pricing](https://aws.amazon.com/rds/proxy/pricing/) for more details.
     *
     * @default `false`
     * @example
     * ```js
     * {
     *   proxy: true
     * }
     * ```
     */
    proxy?: Input<boolean | {
        /**
         * Add extra credentials the proxy can use to connect to the database.
         *
         * Your app will use the master `username` and `password`. So you don't need to specify
         * them here.
         *
         * These credentials are for any other services that need to connect to your database
         * directly.
         *
         * :::tip
         * You need to create these credentials manually in the database.
         * :::
         *
         * These credentials are not automatically created. You'll need to create these
         * credentials manually in the database.
         *
         * @example
         * ```js
         * {
         *   credentials: [
         *     {
         *       username: "metabase",
         *       password: "Passw0rd!"
         *     }
         *   ]
         * }
         * ```
         *
         * You can use a [`Secret`](/docs/component/secret) to manage the password.
         *
         * ```js
         * {
         *   credentials: [
         *     {
         *       username: "metabase",
         *       password: (new sst.Secret("MyDBPassword")).value
         *     }
         *   ]
         * }
         * ```
         */
        credentials?: Input<Input<{
            /**
             * The username of the user.
             */
            username: Input<string>;
            /**
             * The password of the user.
             */
            password: Input<string>;
        }>[]>;
    }>;
    /**
     * The VPC to use for the database cluster.
     *
     * @example
     * Create a VPC component.
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
     *
     * Or pass in a custom VPC configuration.
     *
     * ```js
     * {
     *   vpc: {
     *     subnets: ["subnet-0db7376a7ad4db5fd ", "subnet-06fc7ee8319b2c0ce"],
     *     securityGroups: ["sg-0399348378a4c256c"]
     *   }
     * }
     * ```
     */
    vpc: Vpc | Input<{
        /**
         * A list of subnet IDs in the VPC to deploy the Aurora cluster in.
         */
        subnets: Input<Input<string>[]>;
        /**
         * A list of VPC security group IDs.
         */
        securityGroups: Input<Input<string>[]>;
    }>;
    /**
     * Configure how this component works in `sst dev`.
     *
     * By default, your Aurora database is deployed in `sst dev`. But if you want to instead
     * connect to a locally running database, you can configure the `dev` prop.
     *
     * This will skip deploying an Aurora database and link to the locally running database
     * instead.
     *
     * @example
     *
     * Setting the `dev` prop also means that any linked resources will connect to the right
     * database both in `sst dev` and `sst deploy`.
     *
     * ```ts
     * {
     *   dev: {
     *     username: "postgres",
     *     password: "password",
     *     database: "postgres",
     *     host: "localhost",
     *     port: 5432
     *   }
     * }
     * ```
     */
    dev?: {
        /**
         * The host of the local database to connect to when running in dev.
         * @default `"localhost"`
         */
        host?: Input<string>;
        /**
         * The port of the local database to connect to when running in dev.
         * @default `5432`
         */
        port?: Input<number>;
        /**
         * The database of the local database to connect to when running in dev.
         * @default Inherit from the top-level [`database`](#database).
         */
        database?: Input<string>;
        /**
         * The username of the local database to connect to when running in dev.
         * @default Inherit from the top-level [`username`](#username).
         */
        username?: Input<string>;
        /**
         * The password of the local database to connect to when running in dev.
         * @default Inherit from the top-level [`password`](#password).
         */
        password?: Input<string>;
    };
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
         * Transform the RDS cluster parameter group.
         */
        clusterParameterGroup?: Transform<rds.ClusterParameterGroupArgs>;
        /**
         * Transform the RDS instance parameter group.
         */
        instanceParameterGroup?: Transform<rds.ParameterGroupArgs>;
        /**
         * Transform the RDS Cluster.
         */
        cluster?: Transform<rds.ClusterArgs>;
        /**
         * Transform the database instance in the RDS Cluster.
         */
        instance?: Transform<rds.ClusterInstanceArgs>;
        /**
         * Transform the RDS Proxy.
         */
        proxy?: Transform<rds.ProxyArgs>;
    };
}
/**
 * The `Aurora` component lets you add a Aurora Postgres or MySQL cluster to your app
 * using [Amazon Aurora Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html).
 *
 * @example
 *
 * #### Create an Aurora Postgres cluster
 *
 * ```js title="sst.config.ts"
 * const vpc = new sst.aws.Vpc("MyVpc");
 * const database = new sst.aws.Aurora("MyDatabase", {
 *   engine: "postgres",
 *   vpc
 * });
 * ```
 *
 * #### Create an Aurora MySQL cluster
 *
 * ```js title="sst.config.ts"
 * const vpc = new sst.aws.Vpc("MyVpc");
 * const database = new sst.aws.Aurora("MyDatabase", {
 *   engine: "mysql",
 *   vpc
 * });
 * ```
 *
 * #### Change the scaling config
 *
 * ```js title="sst.config.ts"
 * new sst.aws.Aurora("MyDatabase", {
 *   engine: "postgres",
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
 * ```ts title="app/page.tsx" {1,5-9}
 * import { Resource } from "sst";
 * import postgres from "postgres";
 *
 * const sql = postgres({
 *   username: Resource.MyDatabase.username,
 *   password: Resource.MyDatabase.password,
 *   database: Resource.MyDatabase.database,
 *   host: Resource.MyDatabase.host,
 *   port: Resource.MyDatabase.port
 * });
 * ```
 *
 * #### Enable the RDS Data API
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Aurora("MyDatabase", {
 *   engine: "postgres",
 *   dataApi: true,
 *   vpc
 * });
 * ```
 *
 * When using the Data API, connecting to the database does not require a persistent
 * connection, and works over HTTP. You also don't need the `sst tunnel` or a VPN to connect
 * to it from your local machine.
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
 *
 * #### Running locally
 *
 * By default, your Aurora database is deployed in `sst dev`. But let's say you are running
 * Postgres locally.
 *
 * ```bash
 * docker run \
 *   --rm \
 *   -p 5432:5432 \
 *   -v $(pwd)/.sst/storage/postgres:/var/lib/postgresql/data \
 *   -e POSTGRES_USER=postgres \
 *   -e POSTGRES_PASSWORD=password \
 *   -e POSTGRES_DB=local \
 *   postgres:16.4
 * ```
 *
 * You can connect to it in `sst dev` by configuring the `dev` prop.
 *
 * ```ts title="sst.config.ts" {4-9}
 * new sst.aws.Aurora("MyDatabase", {
 *   engine: "postgres",
 *   vpc,
 *   dev: {
 *     username: "postgres",
 *     password: "password",
 *     database: "local",
 *     port: 5432
 *   }
 * });
 * ```
 *
 * This will skip deploying the database and link to the locally running Postgres database
 * instead. [Check out the full example](/docs/examples/#aws-aurora-local).
 *
 * ---
 *
 * ### Cost
 *
 * This component has one DB instance that is used for both writes and reads. The
 * instance can scale from the minimum number of ACUs to the maximum number of ACUs. By default,
 * this uses a `min` of 0 ACUs and a `max` of 4 ACUs.
 *
 * When the database is paused, you are not charged for the ACUs.
 *
 * Each ACU costs $0.12 per hour for both `postgres` and `mysql` engine. The storage costs
 * $0.01 per GB per month for standard storage.
 *
 * So if your database is constantly using 1GB of memory or 0.5 ACUs, then you are charged
 * $0.12 x 0.5 x 24 x 30 or **$43 per month**. And add the storage costs to this as well.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [Amazon Aurora pricing](https://aws.amazon.com/rds/aurora/pricing) for more details.
 *
 * #### RDS Proxy
 *
 * If you enable the `proxy`, it uses _Aurora Capacity Units_ with a minumum of 8 ACUs at
 * $0.015 per ACU hour.
 *
 * That works out to an **additional** $0.015 x 8 x 24 x 30 or **$86 per month**. Adjust
 * this if you end up using more than 8 ACUs.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [RDS Proxy pricing](https://aws.amazon.com/rds/proxy/pricing/) for more details.
 *
 * #### RDS Data API
 *
 * If you enable `dataApi`, you get charged an **additional** $0.35 per million requests for
 * the first billion requests. After that, it's $0.20 per million requests.
 *
 * Check out the [RDS Data API pricing](https://aws.amazon.com/rds/aurora/pricing/#Data_API_costs)
 * for more details.
 */
export declare class Aurora extends Component implements Link.Linkable {
    private cluster?;
    private instance?;
    private secret?;
    private _password?;
    private proxy?;
    private dev?;
    constructor(name: string, args: AuroraArgs, opts?: ComponentResourceOptions);
    /**
     * The ID of the RDS Cluster.
     */
    get id(): Output<string>;
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
    /**
     * The reader endpoint of the database.
     */
    get reader(): Output<string>;
    get nodes(): {
        cluster: import("@pulumi/aws/rds/cluster.js").Cluster | undefined;
        instance: import("@pulumi/aws/rds/clusterInstance.js").ClusterInstance | undefined;
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
            reader: Output<string | undefined>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
    /**
     * Reference an existing Aurora cluster with its RDS cluster ID. This is useful when you
     * create a Aurora cluster in one stage and want to share it in another. It avoids having to
     * create a new Aurora cluster in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share Aurora clusters across stages.
     * :::
     *
     * @param name The name of the component.
     * @param id The ID of the existing Aurora cluster.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a cluster in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new cluster, you want to share the same cluster from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const database = $app.stage === "frank"
     *   ? sst.aws.Aurora.get("MyDatabase", "app-dev-mydatabase")
     *   : new sst.aws.Aurora("MyDatabase");
     * ```
     *
     * Here `app-dev-mydatabase` is the ID of the cluster created in the `dev` stage.
     * You can find this by outputting the cluster ID in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return database.id;
     * ```
     */
    static get(name: string, id: Input<string>, opts?: ComponentResourceOptions): Aurora;
}
export {};
