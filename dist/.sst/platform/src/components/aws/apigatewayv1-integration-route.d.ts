import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { ApiGatewayV1IntegrationArgs } from "./apigatewayv1";
import { ApiGatewayV1BaseRouteArgs } from "./apigatewayv1-base-route";
export interface Args extends ApiGatewayV1BaseRouteArgs {
    /**
     * The route integration.
     */
    integration: ApiGatewayV1IntegrationArgs;
}
/**
 * The `ApiGatewayV1IntegrationRoute` component is internally used by the `ApiGatewayV1` component
 * to add routes to your [API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `routeIntegration` method of the `ApiGatewayV1` component.
 */
export declare class ApiGatewayV1IntegrationRoute extends Component {
    private readonly method;
    private readonly integration;
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The API Gateway REST API integration.
         */
        integration: import("@pulumi/aws/apigateway/integration").Integration;
        /**
         * The API Gateway REST API method.
         */
        method: Output<import("@pulumi/aws/apigateway/method").Method>;
    };
}
