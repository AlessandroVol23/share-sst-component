import { Component, transform } from "../component.js";
import { Service as ServiceV1 } from "./service-v1.js";
import { ecs } from "@pulumi/aws";
export const supportedCpus = {
    "0.25 vCPU": 256,
    "0.5 vCPU": 512,
    "1 vCPU": 1024,
    "2 vCPU": 2048,
    "4 vCPU": 4096,
    "8 vCPU": 8192,
    "16 vCPU": 16384,
};
export const supportedMemories = {
    "0.25 vCPU": {
        "0.5 GB": 512,
        "1 GB": 1024,
        "2 GB": 2048,
    },
    "0.5 vCPU": {
        "1 GB": 1024,
        "2 GB": 2048,
        "3 GB": 3072,
        "4 GB": 4096,
    },
    "1 vCPU": {
        "2 GB": 2048,
        "3 GB": 3072,
        "4 GB": 4096,
        "5 GB": 5120,
        "6 GB": 6144,
        "7 GB": 7168,
        "8 GB": 8192,
    },
    "2 vCPU": {
        "4 GB": 4096,
        "5 GB": 5120,
        "6 GB": 6144,
        "7 GB": 7168,
        "8 GB": 8192,
        "9 GB": 9216,
        "10 GB": 10240,
        "11 GB": 11264,
        "12 GB": 12288,
        "13 GB": 13312,
        "14 GB": 14336,
        "15 GB": 15360,
        "16 GB": 16384,
    },
    "4 vCPU": {
        "8 GB": 8192,
        "9 GB": 9216,
        "10 GB": 10240,
        "11 GB": 11264,
        "12 GB": 12288,
        "13 GB": 13312,
        "14 GB": 14336,
        "15 GB": 15360,
        "16 GB": 16384,
        "17 GB": 17408,
        "18 GB": 18432,
        "19 GB": 19456,
        "20 GB": 20480,
        "21 GB": 21504,
        "22 GB": 22528,
        "23 GB": 23552,
        "24 GB": 24576,
        "25 GB": 25600,
        "26 GB": 26624,
        "27 GB": 27648,
        "28 GB": 28672,
        "29 GB": 29696,
        "30 GB": 30720,
    },
    "8 vCPU": {
        "16 GB": 16384,
        "20 GB": 20480,
        "24 GB": 24576,
        "28 GB": 28672,
        "32 GB": 32768,
        "36 GB": 36864,
        "40 GB": 40960,
        "44 GB": 45056,
        "48 GB": 49152,
        "52 GB": 53248,
        "56 GB": 57344,
        "60 GB": 61440,
    },
    "16 vCPU": {
        "32 GB": 32768,
        "40 GB": 40960,
        "48 GB": 49152,
        "56 GB": 57344,
        "64 GB": 65536,
        "72 GB": 73728,
        "80 GB": 81920,
        "88 GB": 90112,
        "96 GB": 98304,
        "104 GB": 106496,
        "112 GB": 114688,
        "120 GB": 122880,
    },
};
/**
 * The `Cluster` component lets you create a cluster of containers and add services to them.
 * It uses [Amazon ECS](https://aws.amazon.com/ecs/) on [AWS Fargate](https://aws.amazon.com/fargate/).
 *
 * For existing usage, rename `sst.aws.Cluster` to `sst.aws.Cluster.v1`. For new Clusters, use
 * the latest [`Cluster`](/docs/component/aws/cluster) component instead.
 *
 * :::caution
 * This component has been deprecated .
 * :::
 *
 * @example
 *
 * #### Create a Cluster
 *
 * ```ts title="sst.config.ts"
 * const vpc = new sst.aws.Vpc("MyVpc");
 * const cluster = new sst.aws.Cluster.v1("MyCluster", { vpc });
 * ```
 *
 * #### Add a service
 *
 * ```ts title="sst.config.ts"
 * cluster.addService("MyService");
 * ```
 *
 * #### Add a public custom domain
 *
 * ```ts title="sst.config.ts"
 * cluster.addService("MyService", {
 *   public: {
 *     domain: "example.com",
 *     ports: [
 *       { listen: "80/http" },
 *       { listen: "443/https", forward: "80/http" },
 *     ]
 *   }
 * });
 * ```
 *
 * #### Enable auto-scaling
 *
 * ```ts title="sst.config.ts"
 * cluster.addService("MyService", {
 *   scaling: {
 *     min: 4,
 *     max: 16,
 *     cpuUtilization: 50,
 *     memoryUtilization: 50,
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your service. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * cluster.addService("MyService", {
 *   link: [bucket],
 * });
 * ```
 *
 * If your service is written in Node.js, you can use the [SDK](/docs/reference/sdk/)
 * to access the linked resources.
 *
 * ```ts title="app.ts"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export class Cluster extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const parent = this;
        const cluster = createCluster();
        this.args = args;
        this.cluster = cluster;
        function createCluster() {
            return new ecs.Cluster(...transform(args.transform?.cluster, `${name}Cluster`, {}, { parent }));
        }
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon ECS Cluster.
             */
            cluster: this.cluster,
        };
    }
    /**
     * Add a service to the cluster.
     *
     * @param name Name of the service.
     * @param args Configure the service.
     *
     * @example
     *
     * ```ts title="sst.config.ts"
     * cluster.addService("MyService");
     * ```
     *
     * Set a custom domain for the service.
     *
     * ```js {2} title="sst.config.ts"
     * cluster.addService("MyService", {
     *   domain: "example.com"
     * });
     * ```
     *
     * #### Enable auto-scaling
     *
     * ```ts title="sst.config.ts"
     * cluster.addService("MyService", {
     *   scaling: {
     *     min: 4,
     *     max: 16,
     *     cpuUtilization: 50,
     *     memoryUtilization: 50,
     *   }
     * });
     * ```
     */
    addService(name, args) {
        // Do not prefix the service to allow `Resource.MyService` to work.
        return new ServiceV1(name, {
            cluster: {
                name: this.cluster.name,
                arn: this.cluster.arn,
            },
            vpc: this.args.vpc,
            ...args,
        });
    }
}
const __pulumiType = "sst:aws:Cluster";
// @ts-expect-error
Cluster.__pulumiType = __pulumiType;
