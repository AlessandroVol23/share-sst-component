import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component.js";
import { Input } from "../input.js";
import { ec2, efs } from "@pulumi/aws";
import { Vpc } from "./vpc.js";
export interface EfsArgs {
    /**
     * The throughput mode for the EFS file system.
     *
     * The default `elastic` mode scales up or down based on the workload. However, if you know
     * your access patterns, you can use `provisioned` to have a fixed throughput.
     *
     * Or you can use `bursting` to scale with the amount of storage you're using. It also
     * supports bursting to higher levels for up to 12 hours per day.
     *
     * @default `"elastic"`
     *
     * @example
     * ```ts
     * {
     *   throughput: "bursting"
     * }
     * ```
     */
    throughput?: Input<"provisioned" | "bursting" | "elastic">;
    /**
     * The performance mode for the EFS file system.
     *
     * The `max-io` mode can support higher throughput, but with slightly higher latency. It's
     * recommended for larger workloads like data analysis or meadia processing.
     *
     * Both the modes are priced the same, but `general-purpose` is recommended for most use cases.
     *
     * @default `"general-purpose"`
     * @example
     * ```ts
     * {
     *   performance: "max-io"
     * }
     * ```
     */
    performance?: Input<"general-purpose" | "max-io">;
    /**
     * The VPC to use for the EFS file system.
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
     *     subnets: ["subnet-0db7376a7ad4db5fd ", "subnet-06fc7ee8319b2c0ce"]
     *   }
     * }
     * ```
     */
    vpc: Vpc | Input<{
        /**
         * The ID of the VPC.
         */
        id: Input<string>;
        /**
         * A list of subnet IDs in the VPC to create the EFS mount targets in.
         */
        subnets: Input<Input<string>[]>;
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the EFS file system.
         */
        fileSystem?: Transform<efs.FileSystemArgs>;
        /**
         * Transform the EFS access point.
         */
        accessPoint?: Transform<efs.AccessPointArgs>;
        /**
         * Transform the security group for the EFS mount targets.
         */
        securityGroup?: Transform<ec2.SecurityGroupArgs>;
    };
}
/**
 * The `Efs` component lets you add [Amazon Elastic File System (EFS)](https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html) to your app.
 *
 * @example
 *
 * #### Create the file system
 *
 * ```js title="sst.config.ts" {2}
 * const vpc = new sst.aws.Vpc("MyVpc");
 * const efs = new sst.aws.Efs("MyEfs", { vpc });
 * ```
 *
 * This needs a VPC.
 *
 * #### Attach it to a Lambda function
 *
 * ```ts title="sst.config.ts" {4}
 * new sst.aws.Function("MyFunction", {
 *   vpc,
 *   handler: "lambda.handler",
 *   volume: { efs, path: "/mnt/efs" }
 * });
 * ```
 *
 * This is now mounted at `/mnt/efs` in the Lambda function.
 *
 * #### Attach it to a container
 *
 * ```ts title="sst.config.ts" {7}
 * const cluster = new sst.aws.Cluster("MyCluster", { vpc });
 * new sst.aws.Service("MyService", {
 *   cluster,
 *   public: {
 *     ports: [{ listen: "80/http" }],
 *   },
 *   volumes: [
 *     { efs, path: "/mnt/efs" }
 *   ]
 * });
 * ```
 *
 * Mounted at `/mnt/efs` in the container.
 *
 * ---
 *
 * ### Cost
 *
 * By default this component uses _Regional (Multi-AZ) with Elastic Throughput_. The pricing is
 * pay-per-use.
 *
 * - For storage: $0.30 per GB per month
 * - For reads: $0.03 per GB per month
 * - For writes: $0.06 per GB per month
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [EFS pricing](https://aws.amazon.com/efs/pricing/) for more details.
 */
export declare class Efs extends Component {
    private _fileSystem;
    private _accessPoint;
    constructor(name: string, args: EfsArgs, opts?: ComponentResourceOptions);
    /**
     * The ID of the EFS file system.
     */
    get id(): Output<string>;
    /**
     * The ID of the EFS access point.
     */
    get accessPoint(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon EFS file system.
         */
        fileSystem: Output<import("@pulumi/aws/efs/fileSystem.js").FileSystem>;
        /**
         * The Amazon EFS access point.
         */
        accessPoint: Output<import("@pulumi/aws/efs/accessPoint.js").AccessPoint>;
    };
    /**
     * Reference an existing EFS file system with the given file system ID. This is useful when
     * you create a EFS file system in one stage and want to share it in another. It avoids
     * having to create a new EFS file system in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share EFS file systems across stages.
     * :::
     *
     * @param name The name of the component.
     * @param fileSystemID The ID of the existing EFS file system.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a EFS file system in the `dev` stage. And in your personal stage
     * `frank`, instead of creating a new file system, you want to share the same file system
     * from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const efs = $app.stage === "frank"
     *   ? sst.aws.Efs.get("MyEfs", "app-dev-myefs")
     *   : new sst.aws.Efs("MyEfs", { vpc });
     * ```
     *
     * Here `app-dev-myefs` is the ID of the file system created in the `dev` stage.
     * You can find this by outputting the file system ID in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   id: efs.id
     * };
     * ```
     */
    static get(name: string, fileSystemID: Input<string>, opts?: ComponentResourceOptions): Efs;
}
