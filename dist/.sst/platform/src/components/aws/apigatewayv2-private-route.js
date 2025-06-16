import { output, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { apigatewayv2 } from "@pulumi/aws";
import { createApiRoute, } from "./apigatewayv2-base-route";
/**
 * The `ApiGatewayV2PrivateRoute` component is internally used by the `ApiGatewayV2` component
 * to add routes to [Amazon API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `routePrivate` method of the `ApiGatewayV2` component.
 */
export class ApiGatewayV2PrivateRoute extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const api = output(args.api);
        const integration = createIntegration();
        const apiRoute = createApiRoute(name, args, integration.id, self);
        this.apiRoute = apiRoute;
        this.integration = integration;
        function createIntegration() {
            return new apigatewayv2.Integration(...transform(args.transform?.integration, `${name}Integration`, {
                apiId: api.id,
                connectionId: args.vpcLink,
                connectionType: "VPC_LINK",
                integrationType: "HTTP_PROXY",
                integrationUri: args.arn,
                integrationMethod: "ANY",
            }, { parent: self }));
        }
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The API Gateway HTTP API route.
             */
            route: this.apiRoute,
            /**
             * The API Gateway HTTP API integration.
             */
            integration: this.integration,
        };
    }
}
const __pulumiType = "sst:aws:ApiGatewayV2PrivateRoute";
// @ts-expect-error
ApiGatewayV2PrivateRoute.__pulumiType = __pulumiType;
