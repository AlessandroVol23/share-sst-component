import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { Input } from "../input";
import { ec2 } from "@pulumi/aws";
import { Vpc as VpcV1 } from "./vpc-v1";
import { Link } from "../link";
export type { VpcArgs as VpcV1Args } from "./vpc-v1";
export interface VpcArgs {
    /**
     * Specify the Availability Zones or AZs for the VPC.
     *
     * You can specify a number of AZs or a list of AZs. If you specify a number, it will
     * look up the availability zones in the region and automatically select that number of
     * AZs. If you specify a list of AZs, it will use that list of AZs.
     *
     * By default, it creates a VPC with 2 availability zones since services like RDS and
     * Fargate need at least 2 AZs.
     * @default `2`
     * @example
     * Create a VPC with 3 AZs
     * ```ts
     * {
     *   az: 3
     * }
     * ```
     *
     * Create a VPC with specific AZs
     * ```ts
     * {
     *   az: ["us-east-1a", "us-east-1b"]
     * }
     * ```
     */
    az?: Input<number | Input<string>[]>;
    /**
     * Configures NAT. Enabling NAT allows resources in private subnets to connect to the internet.
     *
     * There are two NAT options:
     * 1. `"managed"` creates a [NAT Gateway](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
     * 2. `"ec2"` creates an [EC2 instance](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
     *    with the [fck-nat](https://github.com/AndrewGuenther/fck-nat) AMI
     *
     * For `"managed"`, a NAT Gateway is created in each AZ. All the traffic from
     * the private subnets are routed to the NAT Gateway in the same AZ.
     *
     * NAT Gateways are billed per hour and per gigabyte of data processed. A NAT Gateway for
     * two AZs costs $65 per month. This is relatively expensive but it automatically scales
     * based on the traffic.
     *
     * For `"ec2"`, an EC2 instance of type `t4g.nano` will be launched in each AZ
     * with the [fck-nat](https://github.com/AndrewGuenther/fck-nat) AMI. All the traffic from
     * the private subnets are routed to the Elastic Network Interface (ENI) of the EC2 instance
     * in the same AZ.
     *
     * :::tip
     * The `"ec2"` option uses fck-nat and is 10x cheaper than the `"managed"` NAT Gateway.
     * :::
     *
     * NAT EC2 instances are much cheaper than NAT Gateways, the `t4g.nano` instance type is around
     * $3 per month. But you'll need to scale it up manually if you need more bandwidth.
     *
     * @default NAT is disabled
     * @example
     * ```ts
     * {
     *   nat: "managed"
     * }
     * ```
     */
    nat?: Input<"ec2" | "managed" | {
        /**
         * Configures the type of NAT to create.
         *
         * - If `nat.ec2` is provided, `nat.type` defaults to `"ec2"`.
         * - Otherwise, `nat.type` must be explicitly specified.
         */
        type?: Input<"ec2" | "managed">;
        /**
         * A list of Elastic IP allocation IDs to use for the NAT Gateways or NAT
         * instances. The number of allocation IDs must match the number of AZs.
         *
         * By default, new Elastic IP addresses are created.
         *
         * @example
         * ```ts
         * {
         *   nat: {
         *     ip: ["eipalloc-0123456789abcdef0", "eipalloc-0123456789abcdef1"]
         *   }
         * }
         * ```
         */
        ip?: Input<Input<string>[]>;
        /**
         * Configures the NAT EC2 instance.
         * @default `{instance: "t4g.nano"}`
         * @example
         * ```ts
         * {
         *   nat: {
         *     ec2: {
         *       instance: "t4g.large"
         *     }
         *   }
         * }
         * ```
         */
        ec2?: Input<{
            /**
             * The type of instance to use for the NAT.
             *
             * @default `"t4g.nano"`
             */
            instance: Input<string>;
            /**
             * The AMI to use for the NAT.
             *
             * By default, the latest public [`fck-nat`](https://github.com/AndrewGuenther/fck-nat)
             * AMI is used. However, if the AMI is not available in the region you are
             * deploying to or you want to use a custom AMI, you can specify a different AMI.
             *
             * @default The latest `fck-nat` AMI
             * @example
             * ```ts
             * {
             *   nat: {
             *     ec2: {
             *       ami: "ami-1234567890abcdef0"
             *     }
             *   }
             * }
             * ```
             */
            ami?: Input<string>;
        }>;
    }>;
    /**
     * Configures a bastion host that can be used to connect to resources in the VPC.
     *
     * When enabled, an EC2 instance of type `t4g.nano` with the bastion AMI will be launched
     * in a public subnet. The instance will have AWS SSM (AWS Session Manager) enabled for
     * secure access without the need for SSH key.
     *
     * It costs roughly $3 per month to run the `t4g.nano` instance.
     *
     * :::note
     * If `nat: "ec2"` is enabled, the bastion host will reuse the NAT EC2 instance.
     * :::
     *
     * However if `nat: "ec2"` is enabled, the EC2 instance that NAT creates will be used
     * as the bastion host. No additional EC2 instance will be created.
     *
     * If you are running `sst dev`, a tunnel will be automatically created to the bastion host.
     * This uses a network interface to forward traffic from your local machine to the bastion host.
     *
     * You can learn more about [`sst tunnel`](/docs/reference/cli#tunnel).
     *
     * @default `false`
     * @example
     * ```ts
     * {
     *   bastion: true
     * }
     * ```
     */
    bastion?: Input<boolean>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the EC2 VPC resource.
         */
        vpc?: Transform<ec2.VpcArgs>;
        /**
         * Transform the EC2 Internet Gateway resource.
         */
        internetGateway?: Transform<ec2.InternetGatewayArgs>;
        /**
         * Transform the EC2 NAT Gateway resource.
         */
        natGateway?: Transform<ec2.NatGatewayArgs>;
        /**
         * Transform the EC2 NAT instance resource.
         */
        natInstance?: Transform<ec2.InstanceArgs>;
        /**
         * Transform the EC2 NAT security group resource.
         */
        natSecurityGroup?: Transform<ec2.SecurityGroupArgs>;
        /**
         * Transform the EC2 Elastic IP resource.
         */
        elasticIp?: Transform<ec2.EipArgs>;
        /**
         * Transform the EC2 Security Group resource.
         */
        securityGroup?: Transform<ec2.SecurityGroupArgs>;
        /**
         * Transform the EC2 public subnet resource.
         */
        publicSubnet?: Transform<ec2.SubnetArgs>;
        /**
         * Transform the EC2 private subnet resource.
         */
        privateSubnet?: Transform<ec2.SubnetArgs>;
        /**
         * Transform the EC2 route table resource for the public subnet.
         */
        publicRouteTable?: Transform<ec2.RouteTableArgs>;
        /**
         * Transform the EC2 route table resource for the private subnet.
         */
        privateRouteTable?: Transform<ec2.RouteTableArgs>;
        /**
         * Transform the EC2 bastion instance resource.
         */
        bastionInstance?: Transform<ec2.InstanceArgs>;
        /**
         * Transform the EC2 bastion security group resource.
         */
        bastionSecurityGroup?: Transform<ec2.SecurityGroupArgs>;
    };
}
/**
 * The `Vpc` component lets you add a VPC to your app. It uses [Amazon VPC](https://docs.aws.amazon.com/vpc/). This is useful for services like RDS and Fargate that need to be hosted inside
 * a VPC.
 *
 * This creates a VPC with 2 Availability Zones by default. It also creates the following
 * resources:
 *
 * 1. A default security group blocking all incoming internet traffic.
 * 2. A public subnet in each AZ.
 * 3. A private subnet in each AZ.
 * 4. An Internet Gateway. All the traffic from the public subnets are routed through it.
 * 5. If `nat` is enabled, a NAT Gateway or NAT instance in each AZ. All the traffic from
 *    the private subnets are routed to the NAT in the same AZ.
 *
 * :::note
 * By default, this does not create NAT Gateways or NAT instances.
 * :::
 *
 * @example
 *
 * #### Create a VPC
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Vpc("MyVPC");
 * ```
 *
 * #### Create it with 3 Availability Zones
 *
 * ```ts title="sst.config.ts" {2}
 * new sst.aws.Vpc("MyVPC", {
 *   az: 3
 * });
 * ```
 *
 * #### Enable NAT
 *
 * ```ts title="sst.config.ts" {2}
 * new sst.aws.Vpc("MyVPC", {
 *   nat: "managed"
 * });
 * ```
 *
 * ---
 *
 * ### Cost
 *
 * By default, this component is **free**. Following is the cost to enable the `nat` or `bastion`
 * options.
 *
 * #### Managed NAT
 *
 * If you enable `nat` with the `managed` option, it uses a _NAT Gateway_ per `az` at $0.045 per
 * hour, and $0.045 per GB processed per month.
 *
 * That works out to a minimum of $0.045 x 2 x 24 x 30 or **$65 per month**. Adjust this for the
 * number of `az` and add $0.045 per GB processed per month.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [NAT Gateway pricing](https://aws.amazon.com/vpc/pricing/) for more details. Standard [data
 * transfer charges](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer) apply.
 *
 * #### EC2 NAT
 *
 * If you enable `nat` with the `ec2` option, it uses `t4g.nano` EC2 _On Demand_ instances per
 * `az` at $0.0042 per hour, and $0.09 per GB processed per month for the first 10TB.
 *
 * That works out to a minimum of $0.0042 x 2 x 24 x 30 or **$6 per month**. Adjust this for the
 * `nat.ec2.instance` you are using and add $0.09 per GB processed per month.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [EC2 On-Demand pricing](https://aws.amazon.com/vpc/pricing/) and the
 * [EC2 Data Transfer pricing](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer)
 * for more details.
 *
 * #### Bastion
 *
 * If you enable `bastion`, it uses a single `t4g.nano` EC2 _On Demand_ instance at
 * $0.0042 per hour, and $0.09 per GB processed per month for the first 10TB.
 *
 * That works out to $0.0042 x 24 x 30 or **$3 per month**. Add $0.09 per GB processed per month.
 *
 * However if `nat: "ec2"` is enabled, one of the NAT EC2 instances will be reused; making this
 * **free**.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [EC2 On-Demand pricing](https://aws.amazon.com/vpc/pricing/) and the
 * [EC2 Data Transfer pricing](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer)
 * for more details.
 */
export declare class Vpc extends Component implements Link.Linkable {
    private vpc;
    private internetGateway;
    private securityGroup;
    private natGateways;
    private natInstances;
    private elasticIps;
    private _publicSubnets;
    private _privateSubnets;
    private publicRouteTables;
    private privateRouteTables;
    private bastionInstance;
    private cloudmapNamespace;
    private privateKeyValue;
    static v1: typeof VpcV1;
    constructor(name: string, args?: VpcArgs, opts?: ComponentResourceOptions);
    /**
     * The VPC ID.
     */
    get id(): Output<string>;
    /**
     * A list of public subnet IDs in the VPC.
     */
    get publicSubnets(): Output<Output<string>[]>;
    /**
     * A list of private subnet IDs in the VPC.
     */
    get privateSubnets(): Output<Output<string>[]>;
    /**
     * A list of VPC security group IDs.
     */
    get securityGroups(): Output<Output<string>[]>;
    /**
     * The bastion instance ID.
     */
    get bastion(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon EC2 VPC.
         */
        vpc: import("@pulumi/aws/ec2/vpc").Vpc;
        /**
         * The Amazon EC2 Internet Gateway.
         */
        internetGateway: import("@pulumi/aws/ec2/internetGateway").InternetGateway;
        /**
         * The Amazon EC2 Security Group.
         */
        securityGroup: import("@pulumi/aws/ec2/securityGroup").SecurityGroup;
        /**
         * The Amazon EC2 NAT Gateway.
         */
        natGateways: Output<import("@pulumi/aws/ec2/natGateway").NatGateway[]>;
        /**
         * The Amazon EC2 NAT instances.
         */
        natInstances: Output<import("@pulumi/aws/ec2/instance").Instance[]>;
        /**
         * The Amazon EC2 Elastic IP.
         */
        elasticIps: Output<import("@pulumi/aws/ec2/eip").Eip[]>;
        /**
         * The Amazon EC2 public subnet.
         */
        publicSubnets: Output<import("@pulumi/aws/ec2/subnet").Subnet[]>;
        /**
         * The Amazon EC2 private subnet.
         */
        privateSubnets: Output<import("@pulumi/aws/ec2/subnet").Subnet[]>;
        /**
         * The Amazon EC2 route table for the public subnet.
         */
        publicRouteTables: Output<import("@pulumi/aws/ec2/routeTable").RouteTable[]>;
        /**
         * The Amazon EC2 route table for the private subnet.
         */
        privateRouteTables: Output<import("@pulumi/aws/ec2/routeTable").RouteTable[]>;
        /**
         * The Amazon EC2 bastion instance.
         */
        bastionInstance: Output<import("@pulumi/aws/ec2/instance").Instance | undefined>;
        /**
         * The AWS Cloudmap namespace.
         */
        cloudmapNamespace: import("@pulumi/aws/servicediscovery/privateDnsNamespace").PrivateDnsNamespace;
    };
    /**
     * Reference an existing VPC with the given ID. This is useful when you
     * create a VPC in one stage and want to share it in another stage. It avoids having to
     * create a new VPC in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share VPCs across stages.
     * :::
     *
     * @param name The name of the component.
     * @param vpcId The ID of the existing VPC.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a VPC in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new VPC, you want to share the VPC from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const vpc = $app.stage === "frank"
     *   ? sst.aws.Vpc.get("MyVPC", "vpc-0be8fa4de860618bb")
     *   : new sst.aws.Vpc("MyVPC");
     * ```
     *
     * Here `vpc-0be8fa4de860618bb` is the ID of the VPC created in the `dev` stage.
     * You can find this by outputting the VPC ID in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   vpc: vpc.id
     * };
     * ```
     */
    static get(name: string, vpcId: Input<string>, opts?: ComponentResourceOptions): Vpc;
    /** @internal */
    getSSTLink(): {
        properties: {
            bastion: Output<Output<string> | undefined>;
        };
    };
}
