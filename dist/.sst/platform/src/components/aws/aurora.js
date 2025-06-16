import { all, interpolate, jsonStringify, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component.js";
import { iam, rds, secretsmanager } from "@pulumi/aws";
import { VisibleError } from "../error.js";
import { Vpc } from "./vpc.js";
import { RandomPassword } from "@pulumi/random";
import { DevCommand } from "../experimental/dev-command.js";
import { RdsRoleLookup } from "./providers/rds-role-lookup.js";
import { toSeconds } from "../duration.js";
import { permission } from "./permission.js";
function parseACU(acu) {
    const result = parseFloat(acu.split(" ")[0]);
    return result;
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
export class Aurora extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        if (args && "ref" in args) {
            const ref = reference();
            this.cluster = ref.cluster;
            this.instance = ref.instance;
            this._password = ref.password;
            this.proxy = output(ref.proxy);
            this.secret = ref.secret;
            return;
        }
        const engine = output(args.engine);
        const version = all([args.version, engine]).apply(([version, engine]) => version ?? { postgres: "16.4", mysql: "3.08.0" }[engine]);
        const username = all([args.username, engine]).apply(([username, engine]) => username ?? { postgres: "postgres", mysql: "root" }[engine]);
        const dbName = output(args.database).apply((name) => name ?? $app.name.replaceAll("-", "_"));
        const dataApi = output(args.dataApi).apply((v) => v ?? false);
        const scaling = normalizeScaling();
        const replicas = normalizeReplicas();
        const vpc = normalizeVpc();
        const dev = registerDev();
        if (dev?.enabled) {
            this.dev = dev;
            return;
        }
        const password = createPassword();
        const secret = createSecret();
        const subnetGroup = createSubnetGroup();
        const instanceParameterGroup = createInstanceParameterGroup();
        const clusterParameterGroup = createClusterParameterGroup();
        const proxy = createProxy();
        const cluster = createCluster();
        const instance = createInstances();
        createProxyTarget();
        this.cluster = cluster;
        this.instance = instance;
        this.secret = secret;
        this._password = password;
        this.proxy = proxy;
        function reference() {
            const ref = args;
            const cluster = rds.Cluster.get(`${name}Cluster`, ref.id, undefined, {
                parent: self,
            });
            const instance = rds.ClusterInstance.get(`${name}Instance`, rds
                .getInstancesOutput({
                filters: [
                    {
                        name: "db-cluster-id",
                        values: [cluster.id],
                    },
                ],
            }, { parent: self })
                .instanceIdentifiers.apply((ids) => {
                if (!ids.length) {
                    throw new VisibleError(`Database instance not found in cluster ${cluster.id}`);
                }
                return ids[0];
            }), undefined, { parent: self });
            const secretId = cluster.tags
                .apply((tags) => tags?.["sst:ref:password"])
                .apply((passwordTag) => {
                if (!passwordTag)
                    throw new VisibleError(`Failed to get password for Postgres ${name}.`);
                return passwordTag;
            });
            const secret = secretsmanager.Secret.get(`${name}ProxySecret`, secretId, undefined, { parent: self });
            const secretVersion = secretsmanager.getSecretVersionOutput({ secretId }, { parent: self });
            const password = $jsonParse(secretVersion.secretString).apply((v) => v.password);
            const proxy = cluster.tags
                .apply((tags) => tags?.["sst:ref:proxy"])
                .apply((proxyTag) => proxyTag
                ? rds.Proxy.get(`${name}Proxy`, proxyTag, undefined, {
                    parent: self,
                })
                : undefined);
            return { cluster, instance, proxy, password, secret };
        }
        function normalizeScaling() {
            return output(args.scaling).apply((scaling) => {
                const max = scaling?.max ?? "4 ACU";
                const min = scaling?.min ?? "0 ACU";
                const isAutoPauseEnabled = parseACU(min) === 0;
                if (scaling?.pauseAfter && !isAutoPauseEnabled) {
                    throw new VisibleError(`Cannot configure "pauseAfter" when the minimum ACU is not 0 for the "${name}" Aurora database.`);
                }
                return {
                    max,
                    min,
                    pauseAfter: isAutoPauseEnabled
                        ? scaling?.pauseAfter ?? "5 minutes"
                        : undefined,
                };
            });
        }
        function normalizeReplicas() {
            return output(args.replicas ?? 0).apply((replicas) => {
                if (replicas > 15) {
                    throw new VisibleError(`Cannot create more than 15 read-only replicas for the "${name}" Aurora database.`);
                }
                return replicas;
            });
        }
        function normalizeVpc() {
            // "vpc" is a Vpc component
            if (args.vpc instanceof Vpc) {
                return {
                    subnets: args.vpc.privateSubnets,
                    securityGroups: args.vpc.securityGroups,
                };
            }
            // "vpc" is object
            return output(args.vpc);
        }
        function registerDev() {
            if (!args.dev)
                return undefined;
            if ($dev &&
                args.dev.password === undefined &&
                args.password === undefined) {
                throw new VisibleError(`You must provide the password to connect to your locally running database either by setting the "dev.password" or by setting the top-level "password" property.`);
            }
            const dev = {
                enabled: $dev,
                host: output(args.dev.host ?? "localhost"),
                port: all([args.dev.port, engine]).apply(([port, engine]) => port ?? { postgres: 5432, mysql: 3306 }[engine]),
                username: args.dev.username ? output(args.dev.username) : username,
                password: output(args.dev.password ?? args.password ?? ""),
                database: args.dev.database ? output(args.dev.database) : dbName,
            };
            new DevCommand(`${name}Dev`, {
                dev: {
                    title: name,
                    autostart: true,
                    command: `sst print-and-not-quit`,
                },
                environment: {
                    SST_DEV_COMMAND_MESSAGE: interpolate `Make sure your local database is using:

  username: "${dev.username}"
  password: "${dev.password}"
  database: "${dev.database}"

Listening on "${dev.host}:${dev.port}"...`,
                },
            });
            return dev;
        }
        function createPassword() {
            return args.password
                ? output(args.password)
                : new RandomPassword(`${name}Password`, {
                    length: 32,
                    special: false,
                }, { parent: self }).result;
        }
        function createSecret() {
            const secret = new secretsmanager.Secret(`${name}ProxySecret`, {
                recoveryWindowInDays: 0,
            }, { parent: self });
            new secretsmanager.SecretVersion(`${name}ProxySecretVersion`, {
                secretId: secret.id,
                secretString: jsonStringify({ username, password }),
            }, { parent: self });
            return secret;
        }
        function createSubnetGroup() {
            return new rds.SubnetGroup(...transform(args.transform?.subnetGroup, `${name}SubnetGroup`, {
                subnetIds: vpc.subnets,
            }, { parent: self }));
        }
        function createInstanceParameterGroup() {
            return new rds.ParameterGroup(...transform(args.transform?.instanceParameterGroup, `${name}ParameterGroup`, {
                family: all([engine, version]).apply(([engine, version]) => {
                    if (engine === "postgres")
                        return `aurora-postgresql${version.split(".")[0]}`;
                    return version.startsWith("2")
                        ? `aurora-mysql5.7`
                        : `aurora-mysql8.0`;
                }),
                parameters: [],
            }, { parent: self }));
        }
        function createClusterParameterGroup() {
            return new rds.ClusterParameterGroup(...transform(args.transform?.clusterParameterGroup, `${name}ClusterParameterGroup`, {
                family: all([engine, version]).apply(([engine, version]) => {
                    if (engine === "postgres")
                        return `aurora-postgresql${version.split(".")[0]}`;
                    return version.startsWith("2")
                        ? `aurora-mysql5.7`
                        : `aurora-mysql8.0`;
                }),
                parameters: [],
            }, { parent: self }));
        }
        function createCluster() {
            return new rds.Cluster(...transform(args.transform?.cluster, `${name}Cluster`, {
                engine: engine.apply((engine) => engine === "postgres"
                    ? rds.EngineType.AuroraPostgresql
                    : rds.EngineType.AuroraMysql),
                engineMode: "provisioned",
                engineVersion: all([engine, version]).apply(([engine, version]) => {
                    if (engine === "postgres")
                        return version;
                    return version.startsWith("2")
                        ? `5.7.mysql_aurora.${version}`
                        : `8.0.mysql_aurora.${version}`;
                }),
                databaseName: dbName,
                masterUsername: username,
                masterPassword: password,
                dbClusterParameterGroupName: clusterParameterGroup.name,
                dbInstanceParameterGroupName: instanceParameterGroup.name,
                serverlessv2ScalingConfiguration: scaling.apply((scaling) => ({
                    maxCapacity: parseACU(scaling.max),
                    minCapacity: parseACU(scaling.min),
                    secondsUntilAutoPause: scaling.pauseAfter
                        ? toSeconds(scaling.pauseAfter)
                        : undefined,
                })),
                skipFinalSnapshot: true,
                storageEncrypted: true,
                enableHttpEndpoint: dataApi,
                dbSubnetGroupName: subnetGroup?.name,
                vpcSecurityGroupIds: vpc.securityGroups,
                tags: proxy.apply((proxy) => ({
                    "sst:ref:password": secret.id,
                    ...(proxy ? { "sst:ref:proxy": proxy.id } : {}),
                })),
            }, { parent: self }));
        }
        function createInstances() {
            const props = {
                clusterIdentifier: cluster.id,
                instanceClass: "db.serverless",
                engine: cluster.engine.apply((v) => v),
                engineVersion: cluster.engineVersion,
                dbSubnetGroupName: cluster.dbSubnetGroupName,
                dbParameterGroupName: instanceParameterGroup.name,
            };
            // Create primary instance
            const instance = new rds.ClusterInstance(...transform(args.transform?.instance, `${name}Instance`, props, {
                parent: self,
            }));
            // Create replicas
            replicas.apply((replicas) => {
                for (let i = 0; i < replicas; i++) {
                    new rds.ClusterInstance(...transform(args.transform?.instance, `${name}Replica${i}`, {
                        ...props,
                        promotionTier: 15,
                    }, { parent: self }));
                }
            });
            return instance;
        }
        function createProxy() {
            return all([args.proxy]).apply(([proxy]) => {
                if (!proxy)
                    return;
                const credentials = proxy === true ? [] : proxy.credentials ?? [];
                // Create secrets
                const secrets = credentials.map((credential) => {
                    const secret = new secretsmanager.Secret(`${name}ProxySecret${credential.username}`, {
                        recoveryWindowInDays: 0,
                    }, { parent: self });
                    new secretsmanager.SecretVersion(`${name}ProxySecretVersion${credential.username}`, {
                        secretId: secret.id,
                        secretString: jsonStringify({
                            username: credential.username,
                            password: credential.password,
                        }),
                    }, { parent: self });
                    return secret;
                });
                const role = new iam.Role(`${name}ProxyRole`, {
                    assumeRolePolicy: iam.assumeRolePolicyForPrincipal({
                        Service: "rds.amazonaws.com",
                    }),
                    inlinePolicies: [
                        {
                            name: "inline",
                            policy: iam.getPolicyDocumentOutput({
                                statements: [
                                    {
                                        actions: ["secretsmanager:GetSecretValue"],
                                        resources: [secret.arn, ...secrets.map((s) => s.arn)],
                                    },
                                ],
                            }).json,
                        },
                    ],
                }, { parent: self });
                const lookup = new RdsRoleLookup(`${name}ProxyRoleLookup`, { name: "AWSServiceRoleForRDS" }, { parent: self });
                return new rds.Proxy(...transform(args.transform?.proxy, `${name}Proxy`, {
                    engineFamily: engine.apply((engine) => engine === "postgres" ? "POSTGRESQL" : "MYSQL"),
                    auths: [
                        {
                            authScheme: "SECRETS",
                            iamAuth: "DISABLED",
                            secretArn: secret.arn,
                        },
                        ...secrets.map((s) => ({
                            authScheme: "SECRETS",
                            iamAuth: "DISABLED",
                            secretArn: s.arn,
                        })),
                    ],
                    roleArn: role.arn,
                    vpcSubnetIds: vpc.subnets,
                }, { parent: self, dependsOn: [lookup] }));
            });
        }
        function createProxyTarget() {
            proxy.apply((proxy) => {
                if (!proxy)
                    return;
                const targetGroup = new rds.ProxyDefaultTargetGroup(`${name}ProxyTargetGroup`, {
                    dbProxyName: proxy.name,
                }, { parent: self });
                new rds.ProxyTarget(`${name}ProxyTarget`, {
                    dbProxyName: proxy.name,
                    targetGroupName: targetGroup.name,
                    dbClusterIdentifier: cluster.clusterIdentifier,
                }, { parent: self });
            });
        }
    }
    /**
     * The ID of the RDS Cluster.
     */
    get id() {
        if (this.dev?.enabled)
            return output("placeholder");
        return this.cluster.id;
    }
    /**
     * The ARN of the RDS Cluster.
     */
    get clusterArn() {
        if (this.dev?.enabled)
            return output("placeholder");
        return this.cluster.arn;
    }
    /**
     * The ARN of the master user secret.
     */
    get secretArn() {
        if (this.dev?.enabled)
            return output("placeholder");
        return this.secret.arn;
    }
    /** The username of the master user. */
    get username() {
        if (this.dev?.enabled)
            return this.dev.username;
        return this.cluster.masterUsername;
    }
    /** The password of the master user. */
    get password() {
        if (this.dev?.enabled)
            return this.dev.password;
        return this._password;
    }
    /**
     * The name of the database.
     */
    get database() {
        if (this.dev?.enabled)
            return this.dev.database;
        return this.cluster.databaseName;
    }
    /**
     * The port of the database.
     */
    get port() {
        if (this.dev?.enabled)
            return this.dev.port;
        return this.instance.port;
    }
    /**
     * The host of the database.
     */
    get host() {
        if (this.dev?.enabled)
            return this.dev.host;
        return all([this.cluster.endpoint, this.proxy]).apply(([endpoint, proxy]) => proxy?.endpoint ?? output(endpoint.split(":")[0]));
    }
    /**
     * The reader endpoint of the database.
     */
    get reader() {
        if (this.dev?.enabled)
            return this.dev.host;
        return all([this.cluster.readerEndpoint, this.proxy]).apply(([endpoint, proxy]) => {
            if (proxy) {
                throw new VisibleError("Reader endpoint is not currently supported for RDS Proxy. Please contact us on Discord or open a GitHub issue.");
            }
            return output(endpoint.split(":")[0]);
        });
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
                database: this.database,
                username: this.username,
                password: this.password,
                port: this.port,
                host: this.host,
                reader: this.dev?.enabled
                    ? this.dev.host
                    : all([this.cluster.readerEndpoint, this.proxy]).apply(([endpoint, proxy]) => {
                        if (proxy)
                            return output(undefined);
                        return output(endpoint.split(":")[0]);
                    }),
            },
            include: this.dev?.enabled
                ? []
                : [
                    permission({
                        actions: ["secretsmanager:GetSecretValue"],
                        resources: [this.secretArn],
                    }),
                    permission({
                        actions: [
                            "rds-data:BatchExecuteStatement",
                            "rds-data:BeginTransaction",
                            "rds-data:CommitTransaction",
                            "rds-data:ExecuteStatement",
                            "rds-data:RollbackTransaction",
                        ],
                        resources: [this.clusterArn],
                    }),
                ],
        };
    }
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
    static get(name, id, opts) {
        return new Aurora(name, {
            ref: true,
            id,
        }, opts);
    }
}
const __pulumiType = "sst:aws:Aurora";
// @ts-expect-error
Aurora.__pulumiType = __pulumiType;
