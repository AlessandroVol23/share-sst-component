import { apigateway } from "@pulumi/aws";
import { Component } from "../component";
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
export class ApiGatewayV1ApiKey extends Component {
    constructor(name, args, opts = {}) {
        super(__pulumiType, name, args, opts);
        const self = this;
        this.key = new apigateway.ApiKey(`${name}ApiKey`, {
            value: args.value,
        }, { parent: self });
        new apigateway.UsagePlanKey(`${name}UsagePlanKey`, {
            keyId: this.key.id,
            keyType: "API_KEY",
            usagePlanId: args.usagePlanId,
        }, { parent: self });
    }
    /**
     * The API key value.
     */
    get value() {
        return this.key.value;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The API Gateway API Key.
             */
            apiKey: this.key,
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                value: this.value,
            },
        };
    }
}
const __pulumiType = "sst:aws:ApiGatewayV1ApiKey";
// @ts-expect-error
ApiGatewayV1ApiKey.__pulumiType = __pulumiType;
