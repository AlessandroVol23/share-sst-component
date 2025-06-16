import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component } from "../component.js";
import { Link } from "../link.js";
import { ClusterArgs, ClusterServiceArgs } from "./cluster-v1.js";
export interface ServiceArgs extends ClusterServiceArgs {
    /**
     * The cluster to use for the service.
     */
    cluster: Input<{
        /**
         * The name of the cluster.
         */
        name: Input<string>;
        /**
         * The ARN of the cluster.
         */
        arn: Input<string>;
    }>;
    /**
     * The VPC to use for the cluster.
     */
    vpc: ClusterArgs["vpc"];
}
/**
 * The `Service` component is internally used by the `Cluster` component to deploy services to
 * [Amazon ECS](https://aws.amazon.com/ecs/). It uses [AWS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html).
 *
 * :::note
 * This component is not meant to be created directly.
 * :::
 *
 * This component is returned by the `addService` method of the `Cluster` component.
 */
export declare class Service extends Component implements Link.Linkable {
    private readonly service?;
    private readonly taskRole;
    private readonly taskDefinition?;
    private readonly loadBalancer?;
    private readonly domain?;
    private readonly _url?;
    private readonly devUrl?;
    constructor(name: string, args: ServiceArgs, opts?: ComponentResourceOptions);
    /**
     * The URL of the service.
     *
     * If `public.domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated load balancer URL.
     */
    get url(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon ECS Service.
         */
        readonly service: import("@pulumi/aws/ecs/service.js").Service;
        /**
         * The Amazon ECS Task Role.
         */
        readonly taskRole: import("@pulumi/aws/iam/role.js").Role;
        /**
         * The Amazon ECS Task Definition.
         */
        readonly taskDefinition: import("@pulumi/aws/ecs/taskDefinition.js").TaskDefinition;
        /**
         * The Amazon Elastic Load Balancer.
         */
        readonly loadBalancer: import("@pulumi/aws/lb/loadBalancer.js").LoadBalancer;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            url: Output<string> | undefined;
        };
    };
}
