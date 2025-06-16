import { Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { ApiGatewayV1RouteArgs } from "./apigatewayv1";
export interface ApiGatewayV1BaseRouteArgs extends ApiGatewayV1RouteArgs {
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
     * The route method.
     */
    method: string;
    /**
     * The route path.
     */
    path: string;
    /**
     * The route resource ID.
     */
    resourceId: Input<string>;
}
export declare function createMethod(name: string, args: ApiGatewayV1BaseRouteArgs, parent: Component): Output<import("@pulumi/aws/apigateway/method").Method>;
