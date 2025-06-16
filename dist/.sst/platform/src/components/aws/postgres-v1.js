import { jsonParse, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component.js";
import { rds, secretsmanager } from "@pulumi/aws";
import { permission } from "./permission.js";
function parseACU(acu) {
    const result = parseFloat(acu.split(" ")[0]);
    return result;
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
export class Postgres extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        if (args && "ref" in args) {
            const ref = args;
            this.cluster = ref.cluster;
            this.instance = ref.instance;
            return;
        }
        const parent = this;
        const scaling = normalizeScaling();
        const version = normalizeVersion();
        const databaseName = normalizeDatabaseName();
        const subnetGroup = createSubnetGroup();
        const cluster = createCluster();
        const instance = createInstance();
        this.cluster = cluster;
        this.instance = instance;
        function normalizeScaling() {
            return output(args.scaling).apply((scaling) => ({
                minCapacity: parseACU(scaling?.min ?? "0.5 ACU"),
                maxCapacity: parseACU(scaling?.max ?? "4 ACU"),
            }));
        }
        function normalizeVersion() {
            return output(args.version).apply((version) => version ?? "15.5");
        }
        function normalizeDatabaseName() {
            return output(args.databaseName).apply((name) => name ?? $app.name.replaceAll("-", "_"));
        }
        function createSubnetGroup() {
            if (args.vpc === "default")
                return;
            return new rds.SubnetGroup(...transform(args.transform?.subnetGroup, `${name}SubnetGroup`, {
                subnetIds: output(args.vpc).privateSubnets,
            }, { parent }));
        }
        function createCluster() {
            return new rds.Cluster(...transform(args.transform?.cluster, `${name}Cluster`, {
                engine: rds.EngineType.AuroraPostgresql,
                engineMode: "provisioned",
                engineVersion: version,
                databaseName,
                masterUsername: "postgres",
                manageMasterUserPassword: true,
                serverlessv2ScalingConfiguration: scaling,
                skipFinalSnapshot: true,
                enableHttpEndpoint: true,
                dbSubnetGroupName: subnetGroup?.name,
                vpcSecurityGroupIds: args.vpc === "default"
                    ? undefined
                    : output(args.vpc).securityGroups,
            }, { parent }));
        }
        function createInstance() {
            return new rds.ClusterInstance(...transform(args.transform?.instance, `${name}Instance`, {
                clusterIdentifier: cluster.id,
                instanceClass: "db.serverless",
                engine: rds.EngineType.AuroraPostgresql,
                engineVersion: cluster.engineVersion,
                dbSubnetGroupName: subnetGroup?.name,
            }, { parent }));
        }
    }
    get secret() {
        return this.secretArn.apply((val) => {
            if (this._dbSecret)
                return this._dbSecret;
            if (!val)
                return;
            this._dbSecret = secretsmanager.getSecretVersionOutput({
                secretId: val,
            });
            return this._dbSecret;
        });
    }
    /**
     * The ID of the RDS Cluster.
     */
    get clusterID() {
        return this.cluster.id;
    }
    /**
     * The ARN of the RDS Cluster.
     */
    get clusterArn() {
        return this.cluster.arn;
    }
    /**
     * The ARN of the master user secret.
     */
    get secretArn() {
        return this.cluster.masterUserSecrets[0].secretArn;
    }
    /** The username of the master user. */
    get username() {
        return this.cluster.masterUsername;
    }
    /** The password of the master user. */
    get password() {
        return this.cluster.masterPassword.apply((val) => {
            if (val)
                return output(val);
            const parsed = jsonParse(this.secret.apply((secret) => secret ? secret.secretString : output("{}")));
            return parsed.password;
        });
    }
    /**
     * The name of the database.
     */
    get database() {
        return this.cluster.databaseName;
    }
    /**
     * The port of the database.
     */
    get port() {
        return this.instance.port;
    }
    /**
     * The host of the database.
     */
    get host() {
        return this.instance.endpoint;
    }
    get nodes() {
        return {
            cluster: this.cluster,
            instance: this.instance,
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                clusterArn: this.clusterArn,
                secretArn: this.secretArn,
                database: this.cluster.databaseName,
                username: this.username,
                password: this.password,
                port: this.port,
                host: this.host,
            },
            include: [
                permission({
                    actions: ["secretsmanager:GetSecretValue"],
                    resources: [
                        this.cluster.masterUserSecrets[0].secretArn.apply((v) => v ?? "arn:aws:iam::rdsdoesnotusesecretmanager"),
                    ],
                }),
                permission({
                    actions: [
                        "rds-data:BatchExecuteStatement",
                        "rds-data:BeginTransaction",
                        "rds-data:CommitTransaction",
                        "rds-data:ExecuteStatement",
                        "rds-data:RollbackTransaction",
                    ],
                    resources: [this.cluster.arn],
                }),
            ],
        };
    }
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
    static get(name, clusterID) {
        const cluster = rds.Cluster.get(`${name}Cluster`, clusterID);
        const instances = rds.getInstancesOutput({
            filters: [{ name: "db-cluster-id", values: [clusterID] }],
        });
        const instance = rds.ClusterInstance.get(`${name}Instance`, instances.apply((instances) => {
            if (instances.instanceIdentifiers.length === 0)
                throw new Error(`No instance found for cluster ${clusterID}`);
            return instances.instanceIdentifiers[0];
        }));
        return new Postgres(name, {
            ref: true,
            cluster,
            instance,
        });
    }
}
const __pulumiType = "sst:aws:Postgres";
// @ts-expect-error
Postgres.__pulumiType = __pulumiType;
