import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { FunctionArgs, FunctionArn } from "./function";
import { ApiGatewayWebSocketRouteArgs } from "./apigateway-websocket";
export interface Args extends ApiGatewayWebSocketRouteArgs {
    /**
     * The API Gateway to use for the service.
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
    /**
     * The function that’ll be invoked.
     */
    handler: Input<string | FunctionArgs | FunctionArn>;
    /**
     * @internal
     */
    handlerTransform?: Transform<FunctionArgs>;
}
/**
 * The `ApiGatewayWebSocketRoute` component is internally used by the `ApiGatewayWebSocket`
 * component to add routes to your [API Gateway WebSocket API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `route` method of the `ApiGatewayWebSocket` component.
 */
export declare class ApiGatewayWebSocketRoute extends Component {
    private readonly fn;
    private readonly permission;
    private readonly apiRoute;
    private readonly integration;
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Lambda function.
         */
        readonly function: Output<import("./function").Function>;
        /**
         * The Lambda permission.
         */
        permission: import("@pulumi/aws/lambda/permission").Permission;
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
