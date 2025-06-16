import { output, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { apigateway } from "@pulumi/aws";
import { createMethod, } from "./apigatewayv1-base-route";
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
export class ApiGatewayV1IntegrationRoute extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const api = output(args.api);
        const method = createMethod(name, args, self);
        const integration = createIntegration();
        this.method = method;
        this.integration = integration;
        function createIntegration() {
            return new apigateway.Integration(...transform(args.transform?.integration, `${name}Integration`, {
                restApi: api.id,
                resourceId: args.resourceId,
                httpMethod: method.httpMethod,
                ...args.integration,
                type: output(args.integration.type).apply((v) => v.toUpperCase().replaceAll("-", "_")),
                passthroughBehavior: args.integration.passthroughBehavior &&
                    output(args.integration.passthroughBehavior).apply((v) => v.toUpperCase().replaceAll("-", "_")),
            }, { parent: self }));
        }
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The API Gateway REST API integration.
             */
            integration: this.integration,
            /**
             * The API Gateway REST API method.
             */
            method: this.method,
        };
    }
}
const __pulumiType = "sst:aws:ApiGatewayV1IntegrationRoute";
// @ts-expect-error
ApiGatewayV1IntegrationRoute.__pulumiType = __pulumiType;
