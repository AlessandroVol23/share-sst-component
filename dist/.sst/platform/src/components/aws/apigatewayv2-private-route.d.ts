import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { ApiGatewayV2BaseRouteArgs } from "./apigatewayv2-base-route";
export interface Args extends ApiGatewayV2BaseRouteArgs {
    /**
     * The ARN of the AWS Load Balancer or Cloud Map service.
     * @example
     * ```js
     * {
     *   arn: "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188"
     * }
     * ```
     */
    arn: Input<string>;
    /**
     * The ID of the VPC link.
     * @example
     * ```js
     * {
     *   vpcLink: "vpcl-0123456789abcdef"
     * }
     * ```
     */
    vpcLink: Input<string>;
}
/**
 * The `ApiGatewayV2PrivateRoute` component is internally used by the `ApiGatewayV2` component
 * to add routes to [Amazon API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `routePrivate` method of the `ApiGatewayV2` component.
 */
export declare class ApiGatewayV2PrivateRoute extends Component {
    private readonly apiRoute;
    private readonly integration;
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The API Gateway HTTP API route.
         */
        route: Output<import("@pulumi/aws/apigatewayv2/route").Route>;
        /**
         * The API Gateway HTTP API integration.
         */
        integration: import("@pulumi/aws/apigatewayv2/integration").Integration;
    };
}
