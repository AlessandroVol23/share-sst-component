import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { ApiGatewayV1AuthorizerArgs } from "./apigatewayv1";
export interface AuthorizerArgs extends ApiGatewayV1AuthorizerArgs {
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
}
/**
 * The `ApiGatewayV1Authorizer` component is internally used by the `ApiGatewayV1` component
 * to add authorizers to [Amazon API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `addAuthorizer` method of the `ApiGatewayV1` component.
 */
export declare class ApiGatewayV1Authorizer extends Component {
    private readonly authorizer;
    private readonly fn?;
    constructor(name: string, args: AuthorizerArgs, opts?: ComponentResourceOptions);
    /**
     * The ID of the authorizer.
     */
    get id(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The API Gateway Authorizer.
         */
        authorizer: import("@pulumi/aws/apigateway/authorizer").Authorizer;
        /**
         * The Lambda function used by the authorizer.
         */
        readonly function: Output<import("./function").Function>;
    };
}
