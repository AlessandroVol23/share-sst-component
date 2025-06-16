import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { FunctionArgs, FunctionArn } from "./function";
import { ApiGatewayV2BaseRouteArgs } from "./apigatewayv2-base-route";
export interface Args extends ApiGatewayV2BaseRouteArgs {
    /**
     * The route function.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    handler: Input<string | FunctionArgs | FunctionArn>;
    /**
     * The resources to link to the route function.
     */
    handlerLink?: FunctionArgs["link"];
    /**
     * @internal
     */
    handlerTransform?: Transform<FunctionArgs>;
}
/**
 * The `ApiGatewayV2LambdaRoute` component is internally used by the `ApiGatewayV2` component
 * to add routes to your [API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `route` method of the `ApiGatewayV2` component.
 */
export declare class ApiGatewayV2LambdaRoute extends Component {
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
