import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component.js";
import { Link } from "../link.js";
import { Input } from "../input.js";
import { elasticache } from "@pulumi/aws";
import { Vpc } from "./vpc.js";
import { Redis as RedisV1 } from "./redis-v1";
export interface RedisArgs {
    /**
     * The Redis engine to use. The following engines are supported:
     *
     * - `"redis"`: The open-source version of Redis.
     * - `"valkey"`: [Valkey](https://valkey.io/) is a Redis-compatible in-memory key-value store.
     *
     * @default `"redis"`
     */
    engine?: Input<"redis" | "valkey">;
    /**
     * The version of Redis.
     *
     * The default is `"7.1"` for the `"redis"` engine and `"7.2"` for the `"valkey"` engine.
     *
     * Check out the [supported versions](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/supported-engine-versions.html).
     *
     * @default `"7.1"` for Redis, `"7.2"` for Valkey
     * @example
     * ```js
     * {
     *   version: "6.2"
     * }
     * ```
     */
    version?: Input<string>;
    /**
     * The type of instance to use for the nodes of the Redis instance. Check out the [supported instance types](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/CacheNodes.SupportedTypes.html).
     *
     * @default `"t4g.micro"`
     * @example
     * ```js
     * {
     *   instance: "m7g.xlarge"
     * }
     * ```
     */
    instance?: Input<string>;
    /**
     * @deprecated The `cluster.nodes` prop is now the recommended way to configure the
     * number of nodes in the cluster.
     */
    nodes?: Input<number>;
    /**
     * Configure cluster mode for Redis.
     *
     * @default `{ nodes: 1 }`
     * @example
     * Disable cluster mode.
     * ```js
     * {
     *   cluster: false
     * }
     * ```
     */
    cluster?: Input<boolean | {
        /**
         * The number of nodes to use for the Redis cluster.
         *
         * @default `1`
         * @example
         * ```js
         * {
         *   nodes: 4
         * }
         * ```
         */
        nodes: Input<number>;
    }>;
    /**
     * Key-value pairs that define custom parameters for the Redis's parameter group.
     * These values override the defaults set by AWS.
     *
     * @example
     * ```js
     * {
     *   parameters: {
     *     "maxmemory-policy": "noeviction"
     *   }
     * }
     * ```
     */
    parameters?: Input<Record<string, Input<string>>>;
    /**
     * The VPC to use for the Redis instance.
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
         * A list of subnet IDs in the VPC to deploy the Redis instance in.
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
     * By default, your Redis instance is deployed in `sst dev`. But if you want to instead
     * connect to a locally running Redis server, you can configure the `dev` prop.
     *
     * :::note
     * By default, this creates a new Redis ElastiCache instance even in `sst dev`.
     * :::
     *
     * This will skip deploying a Redis ElastiCache instance and link to the locally running
     * Redis server instead.
     *
     * @example
     *
     * Setting the `dev` prop also means that any linked resources will connect to the right
     * Redis instance both in `sst dev` and `sst deploy`.
     *
     * ```ts
     * {
     *   dev: {
     *     host: "localhost",
     *     port: 6379
     *   }
     * }
     * ```
     */
    dev?: {
        /**
         * The host of the local Redis server to connect to when running in dev.
         * @default `"localhost"`
         */
        host?: Input<string>;
        /**
         * The port of the local Redis server when running in dev.
         * @default `6379`
         */
        port?: Input<number>;
        /**
         * The username of the local Redis server to connect to when running in dev.
         * @default `"default"`
         */
        username?: Input<string>;
        /**
         * The password of the local Redis server to connect to when running in dev.
         * @default No password
         */
        password?: Input<string>;
    };
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Redis subnet group.
         */
        subnetGroup?: Transform<elasticache.SubnetGroupArgs>;
        /**
         * Transform the Redis parameter group.
         */
        parameterGroup?: Transform<elasticache.ParameterGroupArgs>;
        /**
         * Transform the Redis cluster.
         */
        cluster?: Transform<elasticache.ReplicationGroupArgs>;
    };
}
/**
 * The `Redis` component lets you add a Redis cluster to your app using
 * [Amazon ElastiCache](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/WhatIs.html).
 *
 * @example
 *
 * #### Create the cluster
 *
 * ```js title="sst.config.ts"
 * const vpc = new sst.aws.Vpc("MyVpc");
 * const redis = new sst.aws.Redis("MyRedis", { vpc });
 * ```
 *
 * #### Link to a resource
 *
 * You can link your cluster to other resources, like a function or your Next.js app.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [redis],
 *   vpc
 * });
 * ```
 *
 * Once linked, you can connect to it from your function code.
 *
 * ```ts title="app/page.tsx" {1,6,7,12,13}
 * import { Resource } from "sst";
 * import { Cluster } from "ioredis";
 *
 * const client = new Cluster(
 *   [{
 *     host: Resource.MyRedis.host,
 *     port: Resource.MyRedis.port
 *   }],
 *   {
 *     redisOptions: {
 *       tls: { checkServerIdentity: () => undefined },
 *       username: Resource.MyRedis.username,
 *       password: Resource.MyRedis.password
 *     }
 *   }
 * );
 * ```
 *
 * #### Running locally
 *
 * By default, your Redis cluster is deployed in `sst dev`. But let's say you are running Redis
 * locally.
 *
 * ```bash
 * docker run \
 *   --rm \
 *   -p 6379:6379 \
 *   -v $(pwd)/.sst/storage/redis:/data \
 *   redis:latest
 * ```
 *
 * You can connect to it in `sst dev` by configuring the `dev` prop.
 *
 * ```ts title="sst.config.ts" {3-6}
 * const redis = new sst.aws.Redis("MyRedis", {
 *   vpc,
 *   dev: {
 *     host: "localhost",
 *     port: 6379
 *   }
 * });
 * ```
 *
 * This will skip deploying a Redis ElastiCache cluster and link to the locally running Redis
 * server instead. [Check out the full example](/docs/examples/#aws-redis-local).
 *
 * ---
 *
 * ### Cost
 *
 * By default this component uses _On-demand nodes_ with a single `cache.t4g.micro` instance.
 *
 * The default `redis` engine costs $0.016 per hour. That works out to $0.016 x 24 x 30 or **$12 per month**.
 *
 * If the `valkey` engine is used, the cost is $0.0128 per hour. That works out to $0.0128 x 24 x 30 or **$9 per month**.
 *
 * Adjust this for the `instance` type and number of `nodes` you are using.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [ElastiCache pricing](https://aws.amazon.com/elasticache/pricing/) for more details.
 */
export declare class Redis extends Component implements Link.Linkable {
    private cluster?;
    private _authToken?;
    private dev?;
    static v1: typeof RedisV1;
    constructor(name: string, args: RedisArgs, opts?: ComponentResourceOptions);
    /**
     * The ID of the Redis cluster.
     */
    get clusterId(): Output<string>;
    /**
     * The username to connect to the Redis cluster.
     */
    get username(): Output<string>;
    /**
     * The password to connect to the Redis cluster.
     */
    get password(): Output<string> | undefined;
    /**
     * The host to connect to the Redis cluster.
     */
    get host(): Output<string>;
    /**
     * The port to connect to the Redis cluster.
     */
    get port(): import("@pulumi/pulumi").OutputInstance<number>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The ElastiCache Redis cluster.
         */
        readonly cluster: Output<import("@pulumi/aws/elasticache/replicationGroup.js").ReplicationGroup>;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            host: Output<string>;
            port: import("@pulumi/pulumi").OutputInstance<number>;
            username: Output<string>;
            password: Output<string> | undefined;
        };
    };
    /**
     * Reference an existing Redis cluster with the given cluster name. This is useful when you
     * create a Redis cluster in one stage and want to share it in another. It avoids having to
     * create a new Redis cluster in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share Redis clusters across stages.
     * :::
     *
     * @param name The name of the component.
     * @param clusterId The id of the existing Redis cluster.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a cluster in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new cluster, you want to share the same cluster from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const redis = $app.stage === "frank"
     *   ? sst.aws.Redis.get("MyRedis", "app-dev-myredis")
     *   : new sst.aws.Redis("MyRedis");
     * ```
     *
     * Here `app-dev-myredis` is the ID of the cluster created in the `dev` stage.
     * You can find this by outputting the cluster ID in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   cluster: redis.clusterId
     * };
     * ```
     */
    static get(name: string, clusterId: Input<string>, opts?: ComponentResourceOptions): Redis;
}
