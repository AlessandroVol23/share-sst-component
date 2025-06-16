import { all, interpolate, jsonStringify, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { iam, rds, secretsmanager } from "@pulumi/aws";
import { RandomPassword } from "@pulumi/random";
import { Vpc } from "./vpc";
import { Vpc as VpcV1 } from "./vpc-v1";
import { VisibleError } from "../error";
import { toGBs } from "../size";
import { DevCommand } from "../experimental/dev-command.js";
import { RdsRoleLookup } from "./providers/rds-role-lookup";
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
export class Mysql extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const _version = 1;
        const self = this;
        if (args && "ref" in args) {
            const ref = reference();
            this.instance = ref.instance;
            this._password = ref.password;
            this.proxy = output(ref.proxy);
            return;
        }
        const multiAz = output(args.multiAz).apply((v) => v ?? false);
        const engineVersion = output(args.version).apply((v) => v ?? "8.0.40");
        const instanceType = output(args.instance).apply((v) => v ?? "t4g.micro");
        const username = output(args.username).apply((v) => v ?? "root");
        const storage = normalizeStorage();
        const dbName = output(args.database).apply((v) => v ?? $app.name.replaceAll("-", "_"));
        const vpc = normalizeVpc();
        const dev = registerDev();
        if (dev?.enabled) {
            this.dev = dev;
            return;
        }
        const password = createPassword();
        const secret = createSecret();
        const subnetGroup = createSubnetGroup();
        const parameterGroup = createParameterGroup();
        const instance = createInstance();
        createReplicas();
        const proxy = createProxy();
        this.instance = instance;
        this._password = password;
        this.proxy = proxy;
        function reference() {
            const ref = args;
            const instance = rds.Instance.get(`${name}Instance`, ref.id, undefined, {
                parent: self,
            });
            const input = instance.tags.apply((tags) => {
                return {
                    proxyId: output(ref.proxyId),
                    passwordTag: tags?.["sst:ref:password"],
                };
            });
            const proxy = input.proxyId.apply((proxyId) => proxyId
                ? rds.Proxy.get(`${name}Proxy`, proxyId, undefined, {
                    parent: self,
                })
                : undefined);
            const password = input.passwordTag.apply((passwordTag) => {
                if (!passwordTag)
                    throw new VisibleError(`Failed to get password for MySQL ${name}.`);
                const secret = secretsmanager.getSecretVersionOutput({ secretId: passwordTag }, { parent: self });
                return $jsonParse(secret.secretString).apply((v) => v.password);
            });
            return { instance, proxy, password };
        }
        function normalizeStorage() {
            return output(args.storage ?? "20 GB").apply((v) => {
                const size = toGBs(v);
                if (size < 20) {
                    throw new VisibleError(`Storage must be at least 20 GB for the ${name} MySQL database.`);
                }
                if (size > 65536) {
                    throw new VisibleError(`Storage cannot be greater than 65536 GB (64 TB) for the ${name} MySQL database.`);
                }
                return size;
            });
        }
        function normalizeVpc() {
            // "vpc" is a Vpc.v1 component
            if (args.vpc instanceof VpcV1) {
                throw new VisibleError(`You are using the "Vpc.v1" component. Please migrate to the latest "Vpc" component.`);
            }
            // "vpc" is a Vpc component
            if (args.vpc instanceof Vpc) {
                return {
                    subnets: args.vpc.privateSubnets,
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
                throw new VisibleError(`You must provide the password to connect to your locally running MySQL database either by setting the "dev.password" or by setting the top-level "password" property.`);
            }
            const dev = {
                enabled: $dev,
                host: output(args.dev.host ?? "localhost"),
                port: output(args.dev.port ?? 3306),
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
                    SST_DEV_COMMAND_MESSAGE: interpolate `Make sure your local MySQL server is using:

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
        function createSubnetGroup() {
            return new rds.SubnetGroup(...transform(args.transform?.subnetGroup, `${name}SubnetGroup`, {
                subnetIds: vpc.subnets,
            }, { parent: self }));
        }
        function createParameterGroup() {
            return new rds.ParameterGroup(...transform(args.transform?.parameterGroup, `${name}ParameterGroup`, {
                family: engineVersion.apply((v) => {
                    const [major, minor, _patch] = v.split(".");
                    return `mysql${major}.${minor}`;
                }),
                parameters: [
                    {
                        name: "require_secure_transport",
                        value: "OFF",
                    },
                ],
            }, { parent: self }));
        }
        function createSecret() {
            const secret = new secretsmanager.Secret(`${name}ProxySecret`, {
                recoveryWindowInDays: 0,
            }, { parent: self });
            new secretsmanager.SecretVersion(`${name}ProxySecretVersion`, {
                secretId: secret.id,
                secretString: jsonStringify({
                    username,
                    password,
                }),
            }, { parent: self });
            return secret;
        }
        function createInstance() {
            return new rds.Instance(...transform(args.transform?.instance, `${name}Instance`, {
                dbName,
                dbSubnetGroupName: subnetGroup.name,
                engine: "mysql",
                engineVersion,
                instanceClass: interpolate `db.${instanceType}`,
                username,
                password,
                parameterGroupName: parameterGroup.name,
                skipFinalSnapshot: true,
                storageEncrypted: true,
                storageType: "gp3",
                allocatedStorage: 20,
                maxAllocatedStorage: storage,
                multiAz,
                backupRetentionPeriod: 7,
                // performance insights is only supported on .micro and .small MySQL instances
                // https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.Engines.html
                performanceInsightsEnabled: instanceType.apply((v) => !v.endsWith(".micro") && !v.endsWith(".small")),
                tags: {
                    "sst:component-version": _version.toString(),
                    "sst:ref:password": secret.id,
                },
            }, { parent: self, deleteBeforeReplace: true }));
        }
        function createReplicas() {
            return output(args.replicas ?? 0).apply((replicas) => Array.from({ length: replicas }).map((_, i) => new rds.Instance(`${name}Replica${i}`, {
                replicateSourceDb: instance.identifier,
                dbName: interpolate `${instance.dbName}_replica${i}`,
                dbSubnetGroupName: instance.dbSubnetGroupName,
                availabilityZone: instance.availabilityZone,
                engine: instance.engine,
                engineVersion: instance.engineVersion,
                instanceClass: instance.instanceClass,
                username: instance.username,
                password: instance.password.apply((v) => v),
                parameterGroupName: instance.parameterGroupName,
                skipFinalSnapshot: true,
                storageEncrypted: instance.storageEncrypted.apply((v) => v),
                storageType: instance.storageType,
                allocatedStorage: instance.allocatedStorage,
                maxAllocatedStorage: instance.maxAllocatedStorage.apply((v) => v),
            }, { parent: self })));
        }
        function createProxy() {
            return output(args.proxy).apply((proxy) => {
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
                const rdsProxy = new rds.Proxy(...transform(args.transform?.proxy, `${name}Proxy`, {
                    engineFamily: "MYSQL",
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
                const targetGroup = new rds.ProxyDefaultTargetGroup(`${name}ProxyTargetGroup`, {
                    dbProxyName: rdsProxy.name,
                }, { parent: self });
                new rds.ProxyTarget(`${name}ProxyTarget`, {
                    dbProxyName: rdsProxy.name,
                    targetGroupName: targetGroup.name,
                    dbInstanceIdentifier: instance.identifier,
                }, { parent: self });
                return rdsProxy;
            });
        }
    }
    /**
     * The identifier of the MySQL instance.
     */
    get id() {
        if (this.dev?.enabled)
            return output("placeholder");
        return this.instance.identifier;
    }
    /**
     * The name of the MySQL proxy.
     */
    get proxyId() {
        if (this.dev?.enabled)
            return output("placeholder");
        return this.proxy.apply((v) => {
            if (!v) {
                throw new VisibleError(`Proxy is not enabled. Enable it with "proxy: true".`);
            }
            return v.id;
        });
    }
    /** The username of the master user. */
    get username() {
        if (this.dev?.enabled)
            return this.dev.username;
        return this.instance.username;
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
        return this.instance.dbName;
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
        return all([this.instance.endpoint, this.proxy]).apply(([endpoint, proxy]) => proxy?.endpoint ?? output(endpoint.split(":")[0]));
    }
    get nodes() {
        return {
            instance: this.instance,
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                database: this.database,
                username: this.username,
                password: this.password,
                port: this.port,
                host: this.host,
            },
        };
    }
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
    static get(name, args, opts) {
        return new Mysql(name, {
            ref: true,
            id: args.id,
            proxyId: args.proxyId,
        }, opts);
    }
}
const __pulumiType = "sst:aws:Mysql";
// @ts-expect-error
Mysql.__pulumiType = __pulumiType;
