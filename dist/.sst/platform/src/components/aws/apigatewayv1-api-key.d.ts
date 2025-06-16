import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { ApiGatewayV1ApiKeyArgs } from "./apigatewayv1";
import { Link } from "../link";
export interface ApiKeyArgs extends ApiGatewayV1ApiKeyArgs {
    /**
     * The API Gateway REST API to use for the API key.
     */
    apiId: Input<string>;
    /**
     * The API Gateway Usage Plan to use for the API key.
     */
    usagePlanId: Input<string>;
}
/**
 * The `ApiGatewayV1ApiKey` component is internally used by the `ApiGatewayV1UsagePlan` component
 * to add API keys to [Amazon API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `addApiKey` method of the `ApiGatewayV1UsagePlan` component.
 */
export declare class ApiGatewayV1ApiKey extends Component implements Link.Linkable {
    private readonly key;
    constructor(name: string, args: ApiKeyArgs, opts?: ComponentResourceOptions);
    /**
     * The API key value.
     */
    get value(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The API Gateway API Key.
         */
        apiKey: import("@pulumi/aws/apigateway/apiKey").ApiKey;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            value: import("@pulumi/pulumi").Output<string>;
        };
    };
}
