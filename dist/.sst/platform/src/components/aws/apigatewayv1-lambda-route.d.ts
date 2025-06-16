import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { FunctionArgs } from "./function";
import { ApiGatewayV1BaseRouteArgs } from "./apigatewayv1-base-route";
export interface Args extends ApiGatewayV1BaseRouteArgs {
    /**
     * The route function.
     */
    handler: Input<string | FunctionArgs>;
    /**
     * @internal
     */
    handlerTransform?: Transform<FunctionArgs>;
}
/**
 * The `ApiGatewayV1LambdaRoute` component is internally used by the `ApiGatewayV1` component
 * to add routes to your [API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `route` method of the `ApiGatewayV1` component.
 */
export declare class ApiGatewayV1LambdaRoute extends Component {
    private readonly fn;
    private readonly permission;
    private readonly method;
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
         * The API Gateway REST API integration.
         */
        integration: import("@pulumi/aws/apigateway/integration").Integration;
        /**
         * The API Gateway REST API method.
         */
        method: Output<import("@pulumi/aws/apigateway/method").Method>;
    };
}
