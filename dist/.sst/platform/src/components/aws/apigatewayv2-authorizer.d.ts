import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { ApiGatewayV2AuthorizerArgs } from "./apigatewayv2";
export interface AuthorizerArgs extends ApiGatewayV2AuthorizerArgs {
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
     * The type of the API Gateway.
     */
    type: "http" | "websocket";
}
/**
 * The `ApiGatewayV2Authorizer` component is internally used by the `ApiGatewayV2` component
 * to add authorizers to [Amazon API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `addAuthorizer` method of the `ApiGatewayV2` component.
 */
export declare class ApiGatewayV2Authorizer extends Component {
    private readonly authorizer;
    constructor(name: string, args: AuthorizerArgs, opts?: ComponentResourceOptions);
    /**
     * The ID of the authorizer.
     */
    get id(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The API Gateway V2 authorizer.
         */
        authorizer: import("@pulumi/aws/apigatewayv2/authorizer").Authorizer;
    };
}
