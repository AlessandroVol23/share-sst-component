import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { ApiGatewayV1ApiKeyArgs, ApiGatewayV1UsagePlanArgs } from "./apigatewayv1";
import { ApiGatewayV1ApiKey } from "./apigatewayv1-api-key";
export interface UsagePlanArgs extends ApiGatewayV1UsagePlanArgs {
    /**
     * The API Gateway REST API to use for the usage plan.
     */
    apiId: Input<string>;
    /**
     * The stage of the API Gateway REST API.
     */
    apiStage: Input<string>;
}
/**
 * The `ApiGatewayV1UsagePlan` component is internally used by the `ApiGatewayV1` component
 * to add usage plans to [Amazon API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `addUsagePlan` method of the `ApiGatewayV1` component.
 */
export declare class ApiGatewayV1UsagePlan extends Component {
    private constructorArgs;
    private constructorOpts;
    private readonly plan;
    constructor(name: string, args: UsagePlanArgs, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The API Gateway Usage Plan.
         */
        usagePlan: import("@pulumi/aws/apigateway/usagePlan").UsagePlan;
    };
    /**
     * Add an API key to the API Gateway usage plan.
     *
     * @param name The name of the API key.
     * @param args Configure the API key.
     * @example
     * ```js title="sst.config.ts"
     * plan.addApiKey("MyKey", {
     *   value: "d41d8cd98f00b204e9800998ecf8427e",
     * });
     * ```
     */
    addApiKey(name: string, args?: ApiGatewayV1ApiKeyArgs): ApiGatewayV1ApiKey;
}
