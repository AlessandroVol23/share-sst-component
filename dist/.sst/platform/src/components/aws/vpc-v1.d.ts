import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { Input } from "../input";
import { ec2 } from "@pulumi/aws";
export interface VpcArgs {
    /**
     * Number of Availability Zones or AZs for the VPC. By default, it creates a VPC with 2
     * AZs since services like RDS and Fargate need at least 2 AZs.
     * @default `2`
     * @example
     * ```ts
     * {
     *   az: 3
     * }
     * ```
     */
    az?: Input<number>;
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
    };
}
/**
 * The `Vpc` component lets you add a VPC to your app, but it has been deprecated because
 * it does not support modifying the number of Availability Zones (AZs) after VPC creation.
 *
 * For existing usage, rename `sst.aws.Vpc` to `sst.aws.Vpc.v1`. For new VPCs, use
 * the latest [`Vpc`](/docs/component/aws/vpc) component instead.
 *
 * :::caution
 * This component has been deprecated.
 * :::
 *
 * This creates a VPC with 2 Availability Zones by default. It also creates the following
 * resources:
 *
 * 1. A security group.
 * 2. A public subnet in each AZ.
 * 3. A private subnet in each AZ.
 * 4. An Internet Gateway, all the traffic from the public subnets are routed through it.
 * 5. A NAT Gateway in each AZ. All the traffic from the private subnets are routed to the
 *    NAT Gateway in the same AZ.
 *
 * :::note
 * By default, this creates two NAT Gateways, one in each AZ. And it roughly costs $33 per
 * NAT Gateway per month.
 * :::
 *
 * NAT Gateways are billed per hour and per gigabyte of data processed. By default,
 * this creates a NAT Gateway in each AZ. And this would be roughly $33 per NAT
 * Gateway per month. Make sure to [review the pricing](https://aws.amazon.com/vpc/pricing/).
 *
 * @example
 *
 * #### Create a VPC
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Vpc.v1("MyVPC");
 * ```
 *
 * #### Create it with 3 Availability Zones
 *
 * ```ts title="sst.config.ts" {2}
 * new sst.aws.Vpc.v1("MyVPC", {
 *   az: 3
 * });
 * ```
 */
export declare class Vpc extends Component {
    private vpc;
    private internetGateway;
    private securityGroup;
    private natGateways;
    private elasticIps;
    private _publicSubnets;
    private _privateSubnets;
    private publicRouteTables;
    private privateRouteTables;
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
    get securityGroups(): Output<string>[];
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
     * @param vpcID The ID of the existing VPC.
     *
     * @example
     * Imagine you create a VPC in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new VPC, you want to share the VPC from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const vpc = $app.stage === "frank"
     *   ? sst.aws.Vpc.v1.get("MyVPC", "vpc-0be8fa4de860618bb")
     *   : new sst.aws.Vpc.v1("MyVPC");
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
    static get(name: string, vpcID: Input<string>): Vpc;
}
