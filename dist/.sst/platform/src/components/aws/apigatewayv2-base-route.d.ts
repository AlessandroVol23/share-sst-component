import { Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { ApiGatewayV2RouteArgs } from "./apigatewayv2";
export interface ApiGatewayV2BaseRouteArgs extends ApiGatewayV2RouteArgs {
    /**
     * The API Gateway to use for the route.
     */
    api: Input<{
        /**
         * The name of the API Gateway.
         */
        name: Input<string>;
        /**
         * The ID of the API Gateway.
         */
        id: Input<string>;
        /**
         * The execution ARN of the API Gateway.
         */
        executionArn: Input<string>;
    }>;
    /**
     * The path for the route.
     */
    route: Input<string>;
}
export declare function createApiRoute(name: string, args: ApiGatewayV2BaseRouteArgs, integrationId: Output<string>, parent: Component): Output<import("@pulumi/aws/apigatewayv2/route").Route>;
