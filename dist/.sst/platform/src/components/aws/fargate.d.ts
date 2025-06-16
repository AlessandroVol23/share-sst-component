import { ComponentResourceOptions } from "@pulumi/pulumi";
import { Input } from "../input";
import { Efs } from "./efs";
import { FunctionArgs } from "./function";
import { RETENTION } from "./logging";
import { ServiceArgs } from "./service";
import { ImageArgs } from "@pulumi/docker-build";
import { Component, Transform } from "../component";
import { cloudwatch, ecs, iam } from "@pulumi/aws";
import { Cluster } from "./cluster";
export declare const supportedCpus: {
    "0.25 vCPU": number;
    "0.5 vCPU": number;
    "1 vCPU": number;
    "2 vCPU": number;
    "4 vCPU": number;
    "8 vCPU": number;
    "16 vCPU": number;
};
export declare const supportedMemories: {
    "0.25 vCPU": {
        "0.5 GB": number;
        "1 GB": number;
        "2 GB": number;
    };
    "0.5 vCPU": {
        "1 GB": number;
        "2 GB": number;
        "3 GB": number;
        "4 GB": number;
    };
    "1 vCPU": {
        "2 GB": number;
        "3 GB": number;
        "4 GB": number;
        "5 GB": number;
        "6 GB": number;
        "7 GB": number;
        "8 GB": number;
    };
    "2 vCPU": {
        "4 GB": number;
        "5 GB": number;
        "6 GB": number;
        "7 GB": number;
        "8 GB": number;
        "9 GB": number;
        "10 GB": number;
        "11 GB": number;
        "12 GB": number;
        "13 GB": number;
        "14 GB": number;
        "15 GB": number;
        "16 GB": number;
    };
    "4 vCPU": {
        "8 GB": number;
        "9 GB": number;
        "10 GB": number;
        "11 GB": number;
        "12 GB": number;
        "13 GB": number;
        "14 GB": number;
        "15 GB": number;
        "16 GB": number;
        "17 GB": number;
        "18 GB": number;
        "19 GB": number;
        "20 GB": number;
        "21 GB": number;
        "22 GB": number;
        "23 GB": number;
        "24 GB": number;
        "25 GB": number;
        "26 GB": number;
        "27 GB": number;
        "28 GB": number;
        "29 GB": number;
        "30 GB": number;
    };
    "8 vCPU": {
        "16 GB": number;
        "20 GB": number;
        "24 GB": number;
        "28 GB": number;
        "32 GB": number;
        "36 GB": number;
        "40 GB": number;
        "44 GB": number;
        "48 GB": number;
        "52 GB": number;
        "56 GB": number;
        "60 GB": number;
    };
    "16 vCPU": {
        "32 GB": number;
        "40 GB": number;
        "48 GB": number;
        "56 GB": number;
        "64 GB": number;
        "72 GB": number;
        "80 GB": number;
        "88 GB": number;
        "96 GB": number;
        "104 GB": number;
        "112 GB": number;
        "120 GB": number;
    };
};
export interface FargateContainerArgs {
    /**
     * The name of the container.
     *
     * This is used as the `--name` option in the Docker run command.
     */
    name: Input<string>;
    /**
     * The amount of CPU allocated to the container.
     *
     * By default, a container can use up to all the CPU allocated to all the containers. If set,
     * this container is capped at this allocation even if more idle CPU is available.
     *
     * The sum of all the containers' CPU must be less than or equal to the total available CPU.
     *
     * @example
     * ```js
     * {
     *   cpu: "0.25 vCPU"
     * }
     * ```
     */
    cpu?: `${number} vCPU`;
    /**
     * The amount of memory allocated to the container.
     *
     * By default, a container can use up to all the memory allocated to all the containers. If
     * set, the container is capped at this allocation. If exceeded, the container will be killed
     * even if there is idle memory available.
     *
     * The sum of all the containers' memory must be less than or equal to the total available
     * memory.
     *
     * @example
     * ```js
     * {
     *   memory: "0.5 GB"
     * }
     * ```
     */
    memory?: `${number} GB`;
    /**
     * Configure the Docker image for the container. Same as the top-level [`image`](#image).
     */
    image?: Input<string | {
        /**
         * The path to the Docker build context. Same as the top-level
         * [`image.context`](#image-context).
         */
        context?: Input<string>;
        /**
         * The path to the Dockerfile. Same as the top-level
         * [`image.dockerfile`](#image-dockerfile).
         */
        dockerfile?: Input<string>;
        /**
         * Key-value pairs of build args. Same as the top-level [`image.args`](#image-args).
         */
        args?: Input<Record<string, Input<string>>>;
        /**
         * The stage to build up to. Same as the top-level [`image.target`](#image-target).
         */
        target?: Input<string>;
    }>;
    /**
     * The command to override the default command in the container. Same as the top-level
     * [`command`](#command).
     */
    command?: Input<string[]>;
    /**
     * The entrypoint to override the default entrypoint in the container. Same as the top-level
     * [`entrypoint`](#entrypoint).
     */
    entrypoint?: Input<string[]>;
    /**
     * Key-value pairs of values that are set as container environment variables. Same as the
     * top-level [`environment`](#environment).
     */
    environment?: FunctionArgs["environment"];
    /**
     * A list of Amazon S3 file paths of environment files to load environment variables
     * from. Same as the top-level [`environmentFiles`](#environmentFiles).
     */
    environmentFiles?: Input<Input<string>[]>;
    /**
     * Configure the logs in CloudWatch. Same as the top-level [`logging`](#logging).
     */
    logging?: Input<{
        /**
         * The duration the logs are kept in CloudWatch. Same as the top-level [`logging.retention`](#logging-retention).
         */
        retention?: Input<keyof typeof RETENTION>;
        /**
         * The name of the CloudWatch log group. Same as the top-level [`logging.name`](#logging-name).
         */
        name?: Input<string>;
    }>;
    /**
     * Key-value pairs of AWS Systems Manager Parameter Store parameter ARNs or AWS Secrets
     * Manager secret ARNs. The values will be loaded into the container as environment
     * variables. Same as the top-level [`ssm`](#ssm).
     */
    ssm?: FargateBaseArgs["ssm"];
    /**
     * Mount Amazon EFS file systems into the container. Same as the top-level
     * [`efs`](#efs).
     */
    volumes?: FargateBaseArgs["volumes"];
}
export interface FargateBaseArgs {
    /**
     * The ECS Cluster to use. Create a new `Cluster` in your app, if you haven't already.
     *
     * ```js title="sst.config.ts"
     * const vpc = new sst.aws.Vpc("MyVpc");
     * const myCluster = new sst.aws.Cluster("MyCluster", { vpc });
     * ```
     *
     * And pass it in.
     *
     * ```js
     * {
     *   cluster: myCluster
     * }
     * ```
     */
    cluster: Cluster;
    /**
     * The CPU architecture of the container.
     * @default `"x86_64"`
     * @example
     * ```js
     * {
     *   architecture: "arm64"
     * }
     * ```
     */
    architecture?: Input<"x86_64" | "arm64">;
    /**
     * The amount of CPU allocated to the container. If there are multiple containers, this is
     * the total amount of CPU shared across all the containers.
     *
     * :::note
     * [View the valid combinations](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html#fargate-tasks-size) of CPU and memory.
     * :::
     *
     * @default `"0.25 vCPU"`
     * @example
     * ```js
     * {
     *   cpu: "1 vCPU"
     * }
     * ```
     */
    cpu?: keyof typeof supportedCpus;
    /**
     * The amount of memory allocated to the container. If there are multiple containers, this is
     * the total amount of memory shared across all the containers.
     *
     * :::note
     * [View the valid combinations](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html#fargate-tasks-size) of CPU and memory.
     * :::
     *
     * @default `"0.5 GB"`
     *
     * @example
     * ```js
     * {
     *   memory: "2 GB"
     * }
     * ```
     */
    memory?: `${number} GB`;
    /**
     * The amount of ephemeral storage (in GB) allocated to the container.
     *
     * @default `"20 GB"`
     *
     * @example
     * ```js
     * {
     *   storage: "100 GB"
     * }
     * ```
     */
    storage?: `${number} GB`;
    /**
     * [Link resources](/docs/linking/) to your containers. This will:
     *
     * 1. Grant the permissions needed to access the resources.
     * 2. Allow you to access it in your app using the [SDK](/docs/reference/sdk/).
     *
     * @example
     *
     * Takes a list of components to link to the containers.
     *
     * ```js
     * {
     *   link: [bucket, stripeKey]
     * }
     * ```
     */
    link?: FunctionArgs["link"];
    /**
     * Permissions and the resources that you need to access. These permissions are
     * used to create the [task role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html).
     *
     * :::tip
     * If you `link` the service to a resource, the permissions to access it are
     * automatically added.
     * :::
     *
     * @example
     * Allow the container to read and write to an S3 bucket called `my-bucket`.
     *
     * ```js
     * {
     *   permissions: [
     *     {
     *       actions: ["s3:GetObject", "s3:PutObject"],
     *       resources: ["arn:aws:s3:::my-bucket/*"]
     *     },
     *   ]
     * }
     * ```
     *
     * Allow the container to perform all actions on an S3 bucket called `my-bucket`.
     *
     * ```js
     * {
     *   permissions: [
     *     {
     *       actions: ["s3:*"],
     *       resources: ["arn:aws:s3:::my-bucket/*"]
     *     },
     *   ]
     * }
     * ```
     *
     * Granting the container permissions to access all resources.
     *
     * ```js
     * {
     *   permissions: [
     *     {
     *       actions: ["*"],
     *       resources: ["*"]
     *     },
     *   ]
     * }
     * ```
     */
    permissions?: FunctionArgs["permissions"];
    /**
     * Configure the Docker build command for building the image or specify a pre-built image.
     *
     * @default Build a Docker image from the Dockerfile in the root directory.
     * @example
     *
     * Building a Docker image.
     *
     * Prior to building the image, SST will automatically add the `.sst` directory
     * to the `.dockerignore` if not already present.
     *
     * ```js
     * {
     *   image: {
     *     context: "./app",
     *     dockerfile: "Dockerfile",
     *     args: {
     *       MY_VAR: "value"
     *     }
     *   }
     * }
     * ```
     *
     * Alternatively, you can pass in a pre-built image.
     *
     * ```js
     * {
     *   image: "nginxdemos/hello:plain-text"
     * }
     * ```
     */
    image?: Input<string | {
        /**
         * The path to the [Docker build context](https://docs.docker.com/build/building/context/#local-context). The path is relative to your project's `sst.config.ts`.
         * @default `"."`
         * @example
         *
         * To change where the Docker build context is located.
         *
         * ```js
         * {
         *   context: "./app"
         * }
         * ```
         */
        context?: Input<string>;
        /**
         * The path to the [Dockerfile](https://docs.docker.com/reference/cli/docker/image/build/#file).
         * The path is relative to the build `context`.
         * @default `"Dockerfile"`
         * @example
         * To use a different Dockerfile.
         * ```js
         * {
         *   dockerfile: "Dockerfile.prod"
         * }
         * ```
         */
        dockerfile?: Input<string>;
        /**
         * Key-value pairs of [build args](https://docs.docker.com/build/guide/build-args/) to pass to the Docker build command.
         * @example
         * ```js
         * {
         *   args: {
         *     MY_VAR: "value"
         *   }
         * }
         * ```
         */
        args?: Input<Record<string, Input<string>>>;
        /**
         * Tags to apply to the Docker image.
         * @example
         * ```js
         * {
         *   tags: ["v1.0.0", "commit-613c1b2"]
         * }
         * ```
         */
        tags?: Input<Input<string>[]>;
        /**
         * The stage to build up to in a [multi-stage Dockerfile](https://docs.docker.com/build/building/multi-stage/#stop-at-a-specific-build-stage).
         * @example
         * ```js
         * {
         *   target: "stage1"
         * }
         * ```
         */
        target?: Input<string>;
    }>;
    /**
     * The command to override the default command in the container.
     * @example
     * ```js
     * {
     *   command: ["npm", "run", "start"]
     * }
     * ```
     */
    command?: Input<Input<string>[]>;
    /**
     * The entrypoint that overrides the default entrypoint in the container.
     * @example
     * ```js
     * {
     *   entrypoint: ["/usr/bin/my-entrypoint"]
     * }
     * ```
     */
    entrypoint?: Input<string[]>;
    /**
     * Key-value pairs of values that are set as [container environment variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/taskdef-envfiles.html).
     * The keys need to:
     *
     * 1. Start with a letter.
     * 2. Be at least 2 characters long.
     * 3. Contain only letters, numbers, or underscores.
     *
     * @example
     *
     * ```js
     * {
     *   environment: {
     *     DEBUG: "true"
     *   }
     * }
     * ```
     */
    environment?: FunctionArgs["environment"];
    /**
     * A list of Amazon S3 object ARNs pointing to [environment files](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/use-environment-file.html)
     * used to load environment variables into the container.
     *
     * Each file must be a plain text file in `.env` format.
     *
     * @example
     * Create an S3 bucket and upload an environment file.
     *
     * ```ts title="sst.config.ts"
     * const bucket = new sst.aws.Bucket("EnvBucket");
     * const file = new aws.s3.BucketObjectv2("EnvFile", {
     *   bucket: bucket.name,
     *   key: "test.env",
     *   content: ["FOO=hello", "BAR=world"].join("\n"),
     * });
     * ```
     *
     * And pass in the ARN of the environment file.
     *
     * ```js title="sst.config.ts"
     * {
     *   environmentFiles: [file.arn]
     * }
     * ```
     */
    environmentFiles?: Input<Input<string>[]>;
    /**
     * Key-value pairs of AWS Systems Manager Parameter Store parameter ARNs or AWS Secrets
     * Manager secret ARNs. The values will be loaded into the container as environment
     * variables.
     * @example
     * ```js
     * {
     *   ssm: {
     *     DATABASE_PASSWORD: "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret-123abc"
     *   }
     * }
     * ```
     */
    ssm?: Input<Record<string, Input<string>>>;
    /**
     * Configure the logs in CloudWatch.
     * @default `{ retention: "1 month" }`
     * @example
     * ```js
     * {
     *   logging: {
     *     retention: "forever"
     *   }
     * }
     * ```
     */
    logging?: Input<{
        /**
         * The duration the logs are kept in CloudWatch.
         * @default `"1 month"`
         */
        retention?: Input<keyof typeof RETENTION>;
        /**
         * The name of the CloudWatch log group. If omitted, the log group name is generated
         * based on the cluster name, service name, and container name.
         * @default `"/sst/cluster/${CLUSTER_NAME}/${SERVICE_NAME}/${CONTAINER_NAME}"`
         */
        name?: Input<string>;
    }>;
    /**
     * Mount Amazon EFS file systems into the container.
     *
     * @example
     * Create an EFS file system.
     *
     * ```ts title="sst.config.ts"
     * const vpc = new sst.aws.Vpc("MyVpc");
     * const fileSystem = new sst.aws.Efs("MyFileSystem", { vpc });
     * ```
     *
     * And pass it in.
     *
     * ```js
     * {
     *   volumes: [
     *     {
     *       efs: fileSystem,
     *       path: "/mnt/efs"
     *     }
     *   ]
     * }
     * ```
     *
     * Or pass in a the EFS file system ID.
     *
     * ```js
     * {
     *   volumes: [
     *     {
     *       efs: {
     *         fileSystem: "fs-12345678",
     *         accessPoint: "fsap-12345678"
     *       },
     *       path: "/mnt/efs"
     *     }
     *   ]
     * }
     * ```
     */
    volumes?: Input<{
        /**
         * The Amazon EFS file system to mount.
         */
        efs: Input<Efs | {
            /**
             * The ID of the EFS file system.
             */
            fileSystem: Input<string>;
            /**
             * The ID of the EFS access point.
             */
            accessPoint: Input<string>;
        }>;
        /**
         * The path to mount the volume.
         */
        path: Input<string>;
    }>[];
    /**
     * Assigns the given IAM role name to the containers. This allows you to pass in a previously
     * created role.
     *
     * :::caution
     * When you pass in a role, it will not update it if you add `permissions` or `link` resources.
     * :::
     *
     * By default, a new IAM role is created. It'll update this role if you add `permissions` or
     * `link` resources.
     *
     * However, if you pass in a role, you'll need to update it manually if you add `permissions`
     * or `link` resources.
     *
     * @default Creates a new role
     * @example
     * ```js
     * {
     *   taskRole: "my-task-role"
     * }
     * ```
     */
    taskRole?: Input<string>;
    /**
     * Assigns the given IAM role name to AWS ECS to launch and manage the containers. This
     * allows you to pass in a previously created role.
     *
     * By default, a new IAM role is created.
     *
     * @default Creates a new role
     * @example
     * ```js
     * {
     *   executionRole: "my-execution-role"
     * }
     * ```
     */
    executionRole?: Input<string>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Docker Image resource.
         */
        image?: Transform<ImageArgs>;
        /**
         * Transform the ECS Execution IAM Role resource.
         */
        executionRole?: Transform<iam.RoleArgs>;
        /**
         * Transform the ECS Task IAM Role resource.
         */
        taskRole?: Transform<iam.RoleArgs>;
        /**
         * Transform the ECS Task Definition resource.
         */
        taskDefinition?: Transform<ecs.TaskDefinitionArgs>;
        /**
         * Transform the CloudWatch log group resource.
         */
        logGroup?: Transform<cloudwatch.LogGroupArgs>;
    };
}
export declare function normalizeArchitecture(args: FargateBaseArgs): import("@pulumi/pulumi").Output<"arm64" | "x86_64">;
export declare function normalizeCpu(args: FargateBaseArgs): import("@pulumi/pulumi").Output<"0.25 vCPU" | "0.5 vCPU" | "1 vCPU" | "2 vCPU" | "4 vCPU" | "8 vCPU" | "16 vCPU">;
export declare function normalizeMemory(cpu: ReturnType<typeof normalizeCpu>, args: FargateBaseArgs): import("@pulumi/pulumi").Output<`${number} GB`>;
export declare function normalizeStorage(args: FargateBaseArgs): import("@pulumi/pulumi").Output<`${number} GB`>;
export declare function normalizeContainers(type: "service" | "task", args: ServiceArgs, name: string, architecture: ReturnType<typeof normalizeArchitecture>): import("@pulumi/pulumi").Output<({
    volumes: import("@pulumi/pulumi").Output<{
        path: string;
        efs: import("@pulumi/pulumi").UnwrappedObject<import("@pulumi/pulumi").UnwrappedObject<{
            /**
             * The ID of the EFS file system.
             */
            fileSystem: Input<string>;
            /**
             * The ID of the EFS access point.
             */
            accessPoint: Input<string>;
        }>> | {
            fileSystem: import("@pulumi/pulumi").Output<string>;
            accessPoint: import("@pulumi/pulumi").Output<string>;
        };
    }[] | undefined>;
    image: import("@pulumi/pulumi").Output<string | {
        context: string;
        platform: "linux/amd64" | "linux/arm64";
        dockerfile?: string | undefined;
        args?: import("@pulumi/pulumi").UnwrappedObject<import("@pulumi/pulumi").UnwrappedObject<Record<string, Input<string>>>> | undefined;
        tags?: import("@pulumi/pulumi").UnwrappedArray<string> | undefined;
        target?: string | undefined;
    }>;
    logging: import("@pulumi/pulumi").Output<{
        retention: "1 day" | "3 days" | "5 days" | "1 week" | "2 weeks" | "1 month" | "2 months" | "3 months" | "4 months" | "5 months" | "6 months" | "1 year" | "13 months" | "18 months" | "2 years" | "3 years" | "5 years" | "6 years" | "7 years" | "8 years" | "9 years" | "10 years" | "forever";
        name: string;
    } | {
        retention: "1 day" | "3 days" | "5 days" | "1 week" | "2 weeks" | "1 month" | "2 months" | "3 months" | "4 months" | "5 months" | "6 months" | "1 year" | "13 months" | "18 months" | "2 years" | "3 years" | "5 years" | "6 years" | "7 years" | "8 years" | "9 years" | "10 years" | "forever";
        name: string;
    } | {
        retention: "1 day" | "3 days" | "5 days" | "1 week" | "2 weeks" | "1 month" | "2 months" | "3 months" | "4 months" | "5 months" | "6 months" | "1 year" | "13 months" | "18 months" | "2 years" | "3 years" | "5 years" | "6 years" | "7 years" | "8 years" | "9 years" | "10 years" | "forever";
        name: string;
    }>;
    health?: import("@pulumi/pulumi").UnwrappedObject<{
        command: Input<string[]>;
        startPeriod?: Input<import("../duration").DurationMinutes>;
        timeout?: Input<import("../duration").DurationMinutes>;
        interval?: Input<import("../duration").DurationMinutes>;
        retries?: Input<number>;
    }> | undefined;
    dev?: import("@pulumi/pulumi").UnwrappedObject<{
        command: Input<string>;
        autostart?: Input<boolean>;
        directory?: Input<string>;
    }> | undefined;
    name: string;
    cpu?: `${number} vCPU` | undefined;
    memory?: `${number} GB` | undefined;
    command?: import("@pulumi/pulumi").UnwrappedArray<string> | undefined;
    entrypoint?: import("@pulumi/pulumi").UnwrappedArray<string> | undefined;
    environment?: import("@pulumi/pulumi").UnwrappedObject<Record<string, Input<string>>> | undefined;
    environmentFiles?: import("@pulumi/pulumi").UnwrappedArray<Input<string>> | undefined;
    ssm?: import("@pulumi/pulumi").UnwrappedObject<Record<string, Input<string>>> | undefined;
} | {
    volumes: import("@pulumi/pulumi").Output<{
        path: string;
        efs: import("@pulumi/pulumi").UnwrappedObject<import("@pulumi/pulumi").UnwrappedObject<{
            /**
             * The ID of the EFS file system.
             */
            fileSystem: Input<string>;
            /**
             * The ID of the EFS access point.
             */
            accessPoint: Input<string>;
        }>> | {
            fileSystem: import("@pulumi/pulumi").Output<string>;
            accessPoint: import("@pulumi/pulumi").Output<string>;
        };
    }[] | undefined>;
    image: import("@pulumi/pulumi").Output<string | {
        context: string;
        platform: "linux/amd64" | "linux/arm64";
        dockerfile?: string | undefined;
        args?: import("@pulumi/pulumi").UnwrappedObject<import("@pulumi/pulumi").UnwrappedObject<Record<string, Input<string>>>> | undefined;
        tags?: import("@pulumi/pulumi").UnwrappedArray<string> | undefined;
        target?: string | undefined;
    }>;
    logging: import("@pulumi/pulumi").Output<{
        retention: "1 day" | "3 days" | "5 days" | "1 week" | "2 weeks" | "1 month" | "2 months" | "3 months" | "4 months" | "5 months" | "6 months" | "1 year" | "13 months" | "18 months" | "2 years" | "3 years" | "5 years" | "6 years" | "7 years" | "8 years" | "9 years" | "10 years" | "forever";
        name: string;
    } | {
        retention: "1 day" | "3 days" | "5 days" | "1 week" | "2 weeks" | "1 month" | "2 months" | "3 months" | "4 months" | "5 months" | "6 months" | "1 year" | "13 months" | "18 months" | "2 years" | "3 years" | "5 years" | "6 years" | "7 years" | "8 years" | "9 years" | "10 years" | "forever";
        name: string;
    } | {
        retention: "1 day" | "3 days" | "5 days" | "1 week" | "2 weeks" | "1 month" | "2 months" | "3 months" | "4 months" | "5 months" | "6 months" | "1 year" | "13 months" | "18 months" | "2 years" | "3 years" | "5 years" | "6 years" | "7 years" | "8 years" | "9 years" | "10 years" | "forever";
        name: string;
    }>;
    name: string;
    cpu: undefined;
    memory: undefined;
    environment: import("@pulumi/pulumi").UnwrappedObject<Record<string, Input<string>>> | undefined;
    environmentFiles: import("@pulumi/pulumi").UnwrappedArray<Input<string>> | undefined;
    ssm: import("@pulumi/pulumi").UnwrappedObject<Record<string, Input<string>>> | undefined;
    command: import("@pulumi/pulumi").UnwrappedArray<Input<string>> | undefined;
    entrypoint: import("@pulumi/pulumi").UnwrappedArray<string> | undefined;
    health: import("@pulumi/pulumi").UnwrappedObject<{
        command: Input<string[]>;
        startPeriod?: Input<import("../duration").DurationMinutes>;
        timeout?: Input<import("../duration").DurationMinutes>;
        interval?: Input<import("../duration").DurationMinutes>;
        retries?: Input<number>;
    }> | undefined;
    dev: false | import("@pulumi/pulumi").UnwrappedObject<{
        url?: Input<string>;
        command?: Input<string>;
        autostart?: Input<boolean>;
        directory?: Input<string>;
    }> | undefined;
})[]>;
export declare function createTaskRole(name: string, args: FargateBaseArgs, opts: ComponentResourceOptions, parent: Component, dev: boolean, additionalPermissions?: FunctionArgs["permissions"]): import("@pulumi/aws/iam/role").Role;
export declare function createExecutionRole(name: string, args: FargateBaseArgs, opts: ComponentResourceOptions, parent: Component): import("@pulumi/aws/iam/role").Role;
export declare function createTaskDefinition(name: string, args: ServiceArgs, opts: ComponentResourceOptions, parent: Component, containers: ReturnType<typeof normalizeContainers>, architecture: ReturnType<typeof normalizeArchitecture>, cpu: ReturnType<typeof normalizeCpu>, memory: ReturnType<typeof normalizeMemory>, storage: ReturnType<typeof normalizeStorage>, taskRole: ReturnType<typeof createTaskRole>, executionRole: ReturnType<typeof createExecutionRole>): import("@pulumi/pulumi").Output<import("@pulumi/aws/ecs/taskDefinition").TaskDefinition>;
