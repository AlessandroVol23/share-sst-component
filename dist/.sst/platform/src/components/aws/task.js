import { all, output } from "@pulumi/pulumi";
import { Component } from "../component.js";
import { permission } from "./permission.js";
import { Vpc } from "./vpc.js";
import { Function } from "./function.js";
import { createExecutionRole, createTaskDefinition, createTaskRole, normalizeArchitecture, normalizeContainers, normalizeCpu, normalizeMemory, normalizeStorage, } from "./fargate.js";
/**
 * The `Task` component lets you create containers that are used for long running asynchronous
 * work, like data processing. It uses [Amazon ECS](https://aws.amazon.com/ecs/) on
 * [AWS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html).
 *
 * @example
 *
 * #### Create a Task
 *
 * Tasks are run inside an ECS Cluster. If you haven't already, create one.
 *
 * ```ts title="sst.config.ts"
 * const vpc = new sst.aws.Vpc("MyVpc");
 * const cluster = new sst.aws.Cluster("MyCluster", { vpc });
 * ```
 *
 * Add the task to it.
 *
 * ```ts title="sst.config.ts"
 * const task = new sst.aws.Task("MyTask", { cluster });
 * ```
 *
 * #### Configure the container image
 *
 * By default, the task will look for a Dockerfile in the root directory. Optionally,
 * configure the image context and dockerfile.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Task("MyTask", {
 *   cluster,
 *   image: {
 *     context: "./app",
 *     dockerfile: "Dockerfile"
 *   }
 * });
 * ```
 *
 * To add multiple containers in the task, pass in an array of containers args.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Task("MyTask", {
 *   cluster,
 *   containers: [
 *     {
 *       name: "app",
 *       image: "nginxdemos/hello:plain-text"
 *     },
 *     {
 *       name: "admin",
 *       image: {
 *         context: "./admin",
 *         dockerfile: "Dockerfile"
 *       }
 *     }
 *   ]
 * });
 * ```
 *
 * This is useful for running sidecar containers.
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your task. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {5} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Task("MyTask", {
 *   cluster,
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources in your task.
 *
 * ```ts title="app.ts"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 *
 * #### Task SDK
 *
 * With the [Task JS SDK](/docs/component/aws/task#sdk), you can run your tasks, stop your
 * tasks, and get the status of your tasks.
 *
 * For example, you can link the task to a function in your app.
 *
 * ```ts title="sst.config.ts" {3}
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   link: [task]
 * });
 * ```
 *
 * Then from your function run the task.
 *
 * ```ts title="src/lambda.ts"
 * import { Resource } from "sst";
 * import { task } from "sst/aws/task";
 *
 * const runRet = await task.run(Resource.MyTask);
 * const taskArn = runRet.arn;
 * ```
 *
 * If you are not using Node.js, you can use the AWS SDK instead. Here's
 * [how to run a task](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_RunTask.html).
 *
 * ---
 *
 * ### Cost
 *
 * By default, this uses a _Linux/X86_ _Fargate_ container with 0.25 vCPUs at $0.04048 per
 * vCPU per hour and 0.5 GB of memory at $0.004445 per GB per hour. It includes 20GB of
 * _Ephemeral Storage_ for free with additional storage at $0.000111 per GB per hour. Each
 * container also gets a public IPv4 address at $0.005 per hour.
 *
 * It works out to $0.04048 x 0.25 + $0.004445 x 0.5 + $0.005. Or **$0.02 per hour**
 * your task runs for.
 *
 * Adjust this for the `cpu`, `memory` and `storage` you are using. And
 * check the prices for _Linux/ARM_ if you are using `arm64` as your `architecture`.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [Fargate pricing](https://aws.amazon.com/fargate/pricing/) and the
 * [Public IPv4 Address pricing](https://aws.amazon.com/vpc/pricing/) for more details.
 */
export class Task extends Component {
    constructor(name, args, opts = {}) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const dev = normalizeDev();
        const architecture = normalizeArchitecture(args);
        const cpu = normalizeCpu(args);
        const memory = normalizeMemory(cpu, args);
        const storage = normalizeStorage(args);
        const containers = normalizeContainers("task", args, name, architecture);
        const vpc = normalizeVpc();
        const publicIp = normalizePublicIp();
        const taskRole = createTaskRole(name, args, opts, self, dev, dev
            ? [
                {
                    actions: ["appsync:*"],
                    resources: ["*"],
                },
            ]
            : []);
        this.dev = dev;
        this.taskRole = taskRole;
        const executionRole = createExecutionRole(name, args, opts, self);
        const taskDefinition = createTaskDefinition(name, args, opts, self, dev
            ? containers.apply(async (v) => {
                const appsync = await Function.appsync();
                return [
                    {
                        ...v[0],
                        image: output("ghcr.io/sst/sst/bridge-task:20241224005724"),
                        environment: {
                            ...v[0].environment,
                            SST_TASK_ID: name,
                            SST_REGION: process.env.SST_AWS_REGION,
                            SST_APPSYNC_HTTP: appsync.http,
                            SST_APPSYNC_REALTIME: appsync.realtime,
                            SST_APP: $app.name,
                            SST_STAGE: $app.stage,
                        },
                    },
                ];
            })
            : containers, architecture, cpu, memory, storage, taskRole, executionRole);
        this._cluster = args.cluster;
        this.vpc = vpc;
        this.executionRole = executionRole;
        this._taskDefinition = taskDefinition;
        this._publicIp = publicIp;
        this.containerNames = containers.apply((v) => v.map((v) => output(v.name)));
        this.registerOutputs({
            _task: all([args.dev, containers]).apply(([v, containers]) => ({
                directory: (() => {
                    if (!containers[0].image)
                        return "";
                    if (typeof containers[0].image === "string")
                        return "";
                    if (containers[0].image.context)
                        return containers[0].image.context;
                    return "";
                })(),
                ...v,
            })),
        });
        function normalizeDev() {
            if (!$dev)
                return false;
            if (args.dev === false)
                return false;
            return true;
        }
        function normalizeVpc() {
            // "vpc" is a Vpc component
            if (args.cluster.vpc instanceof Vpc) {
                const vpc = args.cluster.vpc;
                return {
                    isSstVpc: true,
                    containerSubnets: vpc.publicSubnets,
                    securityGroups: vpc.securityGroups,
                };
            }
            // "vpc" is object
            return {
                isSstVpc: false,
                containerSubnets: output(args.cluster.vpc).apply((v) => v.containerSubnets.map((v) => output(v))),
                securityGroups: output(args.cluster.vpc).apply((v) => v.securityGroups.map((v) => output(v))),
            };
        }
        function normalizePublicIp() {
            return all([args.publicIp, vpc.isSstVpc]).apply(([publicIp, isSstVpc]) => publicIp ?? isSstVpc);
        }
    }
    /**
     * The ARN of the ECS Task Definition.
     */
    get taskDefinition() {
        return this._taskDefinition.arn;
    }
    /**
     * The names of the containers in the task.
     * @internal
     */
    get containers() {
        return this.containerNames;
    }
    /**
     * The ARN of the cluster this task is deployed to.
     * @internal
     */
    get cluster() {
        return this._cluster.nodes.cluster.arn;
    }
    /**
     * The security groups for the task.
     * @internal
     */
    get securityGroups() {
        return this.vpc.securityGroups;
    }
    /**
     * The subnets for the task.
     * @internal
     */
    get subnets() {
        return this.vpc.containerSubnets;
    }
    /**
     * Whether to assign a public IP address to the task.
     * @internal
     */
    get assignPublicIp() {
        return this._publicIp;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon ECS Execution Role.
             */
            executionRole: this.executionRole,
            /**
             * The Amazon ECS Task Role.
             */
            taskRole: this.taskRole,
            /**
             * The Amazon ECS Task Definition.
             */
            taskDefinition: this._taskDefinition,
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                cluster: this.cluster,
                containers: this.containers,
                taskDefinition: this.taskDefinition,
                subnets: this.subnets,
                securityGroups: this.securityGroups,
                assignPublicIp: this.assignPublicIp,
            },
            include: [
                permission({
                    actions: ["ecs:*"],
                    resources: [
                        this._taskDefinition.arn,
                        // permissions to describe and stop the task
                        this.cluster.apply((v) => v.split(":cluster/").join(":task/") + "/*"),
                    ],
                }),
                permission({
                    actions: ["iam:PassRole"],
                    resources: [this.executionRole.arn, this.taskRole.arn],
                }),
            ],
        };
    }
}
const __pulumiType = "sst:aws:Task";
// @ts-expect-error
Task.__pulumiType = __pulumiType;
