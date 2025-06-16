import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { Link } from "../link";
import { Input } from "../input.js";
import { rds } from "@pulumi/aws";
import { Vpc } from "./vpc";
import { SizeGbTb } from "../size";
export interface MysqlArgs {
    /**
     * The MySQL engine version. Check out the [available versions in your region](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html).
     * @default `"8.0.40"`
     * @example
     * ```js
     * {
     *   version: "8.4.4"
     * }
     * ```
     */
    version?: Input<string>;
    /**
     * The username of the master user.
     *
     * :::caution
     * Changing the username will cause the database to be destroyed and recreated.
     * :::
     *
     * @default `"root"`
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
     * You can use a `Secret` to manage the password.
     *
     * ```js
     * {
     *   password: new sst.Secret("MyDBPassword").value
     * }
     * ```
     */
    password?: Input<string>;
    /**
     * Name of a database that is automatically created.
     *
     * The name must begin with a letter and contain only lowercase letters, numbers, or
     * underscores. By default, it takes the name of the app, and replaces the hyphens with
     * underscores.
     *
     * @default Based on the name of the current app
     * @example
     * ```js
     * {
     *   database: "acme"
     * }
     * ```
     */
    database?: Input<string>;
    /**
     * The type of instance to use for the database. Check out the [supported instance types](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.Types.html).
     *
     * @default `"t4g.micro"`
     * @example
     * ```js
     * {
     *   instance: "m7g.xlarge"
     * }
     * ```
     *
     * By default, these changes are not applied immediately by RDS. Instead, they are
     * applied in the next maintenance window. Check out the [full list](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ModifyInstance.Settings.html)
     * of props that are not applied immediately.
     */
    instance?: Input<string>;
    /**
     * The maximum storage limit for the database.
     *
     * RDS will autoscale your storage to match your usage up to the given limit.
     * You are not billed for the maximum storage limit, You are only billed for the storage you use.
     *
     * :::note
     * You are only billed for the storage you use, not the maximum limit.
     * :::
     *
     * By default, [gp3 storage volumes](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html#Concepts.Storage.GeneralSSD)
     * are used without additional provisioned IOPS. This provides good baseline
     * performance for most use cases.
     *
     * The minimum storage size is 20 GB. And the maximum storage size is 64 TB.
     *
     * @default `"20 GB"`
     * @example
     * ```js
     * {
     *   storage: "100 GB"
     * }
     * ```
     */
    storage?: Input<SizeGbTb>;
    /**
     * Enable [RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html) for the database.
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
         * Additional credentials the proxy can use to connect to the database. You don't
         * need to specify the master user credentials as they are always added by default.
         *
         * :::note
         * This component will not create the MySQL users listed here. You need to
         * create them manually in the database.
         * :::
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
         * You can use a `Secret` to manage the password.
         *
         * ```js
         * {
         *   credentials: [
         *     {
         *       username: "metabase",
         *       password: new sst.Secret("MyDBPassword").value
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
     * Enable [Multi-AZ](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html)
     * deployment for the database.
     *
     * This creates a standby replica for the database in another availability zone (AZ). The
     * standby database provides automatic failover in case the primary database fails. However,
     * when the primary database is healthy, the standby database is not used for serving read
     * traffic.
     *
     * :::caution
     * Using Multi-AZ will approximately double the cost of the database since it will be
     * deployed in two AZs.
     * :::
     *
     * @default `false`
     * @example
     * ```js
     * {
     *   multiAz: true
     * }
     * ```
     */
    multiAz?: Input<boolean>;
    /**
     * @internal
     */
    replicas?: Input<number>;
    /**
     * The VPC subnets to use for the database.
     *
     * @example
     * ```js
     * {
     *   vpc: {
     *     subnets: ["subnet-0db7376a7ad4db5fd ", "subnet-06fc7ee8319b2c0ce"]
     *   }
     * }
     * ```
     *
     * Or create a `Vpc` component.
     *
     * ```ts title="sst.config.ts"
     * const myVpc = new sst.aws.Vpc("MyVpc");
     * ```
     *
     * And pass it in. The database will be placed in the private subnets.
     *
     * ```js
     * {
     *   vpc: myVpc
     * }
     * ```
     */
    vpc: Vpc | Input<{
        /**
         * A list of subnet IDs in the VPC.
         */
        subnets: Input<Input<string>[]>;
    }>;
    /**
     * Configure how this component works in `sst dev`.
     *
     * By default, your MySQL database is deployed in `sst dev`. But if you want to instead
     * connect to a locally running MySQL database, you can configure the `dev` prop.
     *
     * :::note
     * This will not create an RDS database in `sst dev`.
     * :::
     *
     * This will skip deploying an RDS database and link to the locally running MySQL database
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
     *     username: "root",
     *     password: "password",
     *     database: "mysql",
     *     host: "localhost",
     *     port: 3306
     *   }
     * }
     * ```
     */
    dev?: {
        /**
         * The host of the local MySQL to connect to when running in dev.
         * @default `"localhost"`
         */
        host?: Input<string>;
        /**
         * The port of the local MySQL to connect to when running in dev.
         * @default `3306`
         */
        port?: Input<number>;
        /**
         * The database of the local MySQL to connect to when running in dev.
         * @default Inherit from the top-level [`database`](#database).
         */
        database?: Input<string>;
        /**
         * The username of the local MySQL to connect to when running in dev.
         * @default Inherit from the top-level [`username`](#username).
         */
        username?: Input<string>;
        /**
         * The password of the local MySQL to connect to when running in dev.
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
         * Transform the RDS parameter group.
         */
        parameterGroup?: Transform<rds.ParameterGroupArgs>;
        /**
         * Transform the database instance in the RDS Cluster.
         */
        instance?: Transform<rds.InstanceArgs>;
        /**
         * Transform the RDS Proxy.
         */
        proxy?: Transform<rds.ProxyArgs>;
    };
}
export interface MysqlGetArgs {
    /**
     * The ID of the database.
     */
    id: Input<string>;
    /**
     * The ID of the proxy.
     */
    proxyId?: Input<string>;
}
/**
 * The `Mysql` component lets you add a MySQL database to your app using
 * [Amazon RDS MySQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html).
 *
 * @example
 *
 * #### Create the database
 *
 * ```js title="sst.config.ts"
 * const vpc = new sst.aws.Vpc("MyVpc");
 * const database = new sst.aws.Mysql("MyDatabase", { vpc });
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
 * import mysql from "mysql2/promise";
 *
 * const connection = await mysql.createConnection({
 *   user: Resource.MyDatabase.username,
 *   password: Resource.MyDatabase.password,
 *   database: Resource.MyDatabase.database,
 *   host: Resource.MyDatabase.host,
 *   port: Resource.MyDatabase.port,
 * });
 * await connection.execute("SELECT NOW()");
 * ```
 *
 * #### Running locally
 *
 * By default, your RDS MySQL database is deployed in `sst dev`. But let's say you are
 * running MySQL locally.
 *
 * ```bash
 * docker run \
 *   --rm \
 *   -p 3306:3306 \
 *   -v $(pwd)/.sst/storage/mysql:/var/lib/mysql/data \
 *   -e MYSQL_DATABASE=local \
 *   -e MYSQL_ROOT_PASSWORD=password \
 *   mysql:8.0
 * ```
 *
 * You can connect to it in `sst dev` by configuring the `dev` prop.
 *
 * ```ts title="sst.config.ts" {3-8}
 * const mysql = new sst.aws.Mysql("MyMysql", {
 *   vpc,
 *   dev: {
 *     username: "root",
 *     password: "password",
 *     database: "local",
 *     port: 3306
 *   }
 * });
 * ```
 *
 * This will skip deploying an RDS database and link to the locally running MySQL database
 * instead.
 *
 * ---
 *
 * ### Cost
 *
 * By default this component uses a _Single-AZ Deployment_, _On-Demand DB Instances_ of a
 * `db.t4g.micro` at $0.016 per hour. And 20GB of _General Purpose gp3 Storage_
 * at $0.115 per GB per month.
 *
 * That works out to $0.016 x 24 x 30 + $0.115 x 20 or **$14 per month**. Adjust this for the
 * `instance` type and the `storage` you are using.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [RDS for MySQL pricing](https://aws.amazon.com/rds/mysql/pricing/#On-Demand_DB_Instances_costs) for more details.
 *
 * #### RDS Proxy
 *
 * If you enable the `proxy`, it uses _Provisioned instances_ with 2 vCPUs at $0.015 per hour.
 *
 * That works out to an **additional** $0.015 x 2 x 24 x 30 or **$22 per month**.
 *
 * This is a rough estimate for _us-east-1_, check out the
 * [RDS Proxy pricing](https://aws.amazon.com/rds/proxy/pricing/) for more details.
 */
export declare class Mysql extends Component implements Link.Linkable {
    private instance?;
    private _password?;
    private proxy?;
    private dev?;
    constructor(name: string, args: MysqlArgs, opts?: ComponentResourceOptions);
    /**
     * The identifier of the MySQL instance.
     */
    get id(): Output<string>;
    /**
     * The name of the MySQL proxy.
     */
    get proxyId(): Output<string>;
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
        instance: import("@pulumi/aws/rds/instance").Instance | undefined;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            database: Output<string>;
            username: Output<string>;
            password: Output<string>;
            port: import("@pulumi/pulumi").OutputInstance<number>;
            host: Output<string>;
        };
    };
    /**
     * Reference an existing MySQL database with the given name. This is useful when you
     * create a MySQL database in one stage and want to share it in another. It avoids
     * having to create a new MySQL database in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share MySQL databases across stages.
     * :::
     *
     * @param name The name of the component.
     * @param args The arguments to get the MySQL database.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a database in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new database, you want to share the same database from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const database = $app.stage === "frank"
     *   ? sst.aws.Mysql.get("MyDatabase", {
     *       id: "app-dev-mydatabase",
     *       proxyId: "app-dev-mydatabase-proxy"
     *     })
     *   : new sst.aws.Mysql("MyDatabase", {
     *       proxy: true
     *     });
     * ```
     *
     * Here `app-dev-mydatabase` is the ID of the database, and `app-dev-mydatabase-proxy`
     * is the ID of the proxy created in the `dev` stage. You can find these by outputting
     * the database ID and proxy ID in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   id: database.id,
     *   proxyId: database.proxyId
     * };
     * ```
     */
    static get(name: string, args: MysqlGetArgs, opts?: ComponentResourceOptions): Mysql;
}
