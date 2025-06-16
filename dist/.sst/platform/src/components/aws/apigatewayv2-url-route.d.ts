import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { ApiGatewayV2BaseRouteArgs } from "./apigatewayv2-base-route";
export interface Args extends ApiGatewayV2BaseRouteArgs {
    /**
     * The URL to route to.
     * @example
     * ```js
     * {
     *   url: "https://example.com"
     * }
     * ```
     */
    url: Input<string>;
}
/**
 * The `ApiGatewayV2UrlRoute` component is internally used by the `ApiGatewayV2` component
 * to add routes to [Amazon API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `routeUrl` method of the `ApiGatewayV2` component.
 */
export declare class ApiGatewayV2UrlRoute extends Component {
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
