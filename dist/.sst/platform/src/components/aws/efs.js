import { all, output } from "@pulumi/pulumi";
import { Component, transform } from "../component.js";
import { ec2, efs } from "@pulumi/aws";
import { Vpc } from "./vpc.js";
import { VisibleError } from "../error.js";
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
export class Efs extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        if (args && "ref" in args) {
            const ref = args;
            this._fileSystem = output(ref.fileSystem);
            this._accessPoint = output(ref.accessPoint);
            return;
        }
        const parent = this;
        const vpc = normalizeVpc();
        const throughput = output(args.throughput ?? "elastic");
        const performance = output(args.performance ?? "general-purpose");
        const fileSystem = createFileSystem();
        const securityGroup = createSecurityGroup();
        const mountTargets = createMountTargets();
        const accessPoint = createAccessPoint();
        const waited = mountTargets.apply((targets) => all(targets.map((target) => target.urn)).apply(() => ({
            fileSystem,
            accessPoint,
        })));
        this._fileSystem = waited.fileSystem;
        this._accessPoint = waited.accessPoint;
        function normalizeVpc() {
            // "vpc" is a Vpc component
            if (args.vpc instanceof Vpc) {
                return output({
                    id: args.vpc.id,
                    subnets: args.vpc.privateSubnets,
                    cidrBlock: args.vpc.nodes.vpc.cidrBlock,
                });
            }
            // "vpc" is object
            return output(args.vpc).apply((vpc) => {
                // Because `vpc.id` is newly required since v3.3.66, some people might not have
                // it, and they should get a type error. We want to throw a descriptive error.
                if (!vpc.id)
                    throw new VisibleError(`Missing "vpc.id" for the "${name}" EFS component. The VPC id is required to create the security group for the EFS mount targets.`);
                const vpcRef = ec2.Vpc.get(`${name}Vpc`, vpc.id, undefined, {
                    parent,
                });
                return {
                    id: vpc.id,
                    subnets: vpc.subnets,
                    cidrBlock: vpcRef.cidrBlock,
                };
            });
        }
        function createFileSystem() {
            return new efs.FileSystem(...transform(args.transform?.fileSystem, `${name}FileSystem`, {
                performanceMode: performance.apply((v) => v === "general-purpose" ? "generalPurpose" : "maxIO"),
                throughputMode: throughput,
                encrypted: true,
            }, { parent }));
        }
        function createSecurityGroup() {
            return new ec2.SecurityGroup(...transform(args.transform?.securityGroup, `${name}SecurityGroup`, {
                description: "Managed by SST",
                vpcId: vpc.id,
                egress: [
                    {
                        fromPort: 0,
                        toPort: 0,
                        protocol: "-1",
                        cidrBlocks: ["0.0.0.0/0"],
                    },
                ],
                ingress: [
                    {
                        fromPort: 0,
                        toPort: 0,
                        protocol: "-1",
                        // Restricts inbound traffic to only within the VPC
                        cidrBlocks: [vpc.cidrBlock],
                    },
                ],
            }, { parent }));
        }
        function createMountTargets() {
            return vpc.subnets.apply((subnets) => subnets.map((subnet) => new efs.MountTarget(`${name}MountTarget${subnet}`, {
                fileSystemId: fileSystem.id,
                subnetId: subnet,
                securityGroups: [securityGroup.id],
            }, { parent })));
        }
        function createAccessPoint() {
            return new efs.AccessPoint(...transform(args.transform?.accessPoint, `${name}AccessPoint`, {
                fileSystemId: fileSystem.id,
                posixUser: {
                    uid: 0,
                    gid: 0,
                },
                rootDirectory: {
                    path: "/",
                },
            }, { parent }));
        }
    }
    /**
     * The ID of the EFS file system.
     */
    get id() {
        return this._fileSystem.id;
    }
    /**
     * The ID of the EFS access point.
     */
    get accessPoint() {
        return this._accessPoint.id;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon EFS file system.
             */
            fileSystem: this._fileSystem,
            /**
             * The Amazon EFS access point.
             */
            accessPoint: this._accessPoint,
        };
    }
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
    static get(name, fileSystemID, opts) {
        const fileSystem = efs.FileSystem.get(`${name}FileSystem`, fileSystemID, undefined, opts);
        const accessPointId = efs
            .getAccessPointsOutput({ fileSystemId: fileSystem.id }, opts)
            .apply((accessPoints) => accessPoints.ids[0]);
        const accessPoint = efs.AccessPoint.get(`${name}AccessPoint`, accessPointId, undefined, opts);
        return new Efs(name, {
            ref: true,
            fileSystem,
            accessPoint,
        });
    }
}
const __pulumiType = "sst:aws:Efs";
// @ts-expect-error
Efs.__pulumiType = __pulumiType;
