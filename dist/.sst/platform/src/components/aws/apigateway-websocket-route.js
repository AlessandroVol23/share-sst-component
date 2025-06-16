import { all, interpolate, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { apigatewayv2, lambda } from "@pulumi/aws";
import { functionBuilder } from "./helpers/function-builder";
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
export class ApiGatewayWebSocketRoute extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const api = output(args.api);
        const route = output(args.route);
        const fn = createFunction();
        const permission = createPermission();
        const integration = createIntegration();
        const apiRoute = createApiRoute();
        this.fn = fn;
        this.permission = permission;
        this.apiRoute = apiRoute;
        this.integration = integration;
        function createFunction() {
            return functionBuilder(`${name}Handler`, args.handler, {
                description: interpolate `${api.name} route ${route}`,
            }, args.handlerTransform, { parent: self });
        }
        function createPermission() {
            return new lambda.Permission(`${name}Permissions`, {
                action: "lambda:InvokeFunction",
                function: fn.arn,
                principal: "apigateway.amazonaws.com",
                sourceArn: interpolate `${api.executionArn}/*`,
            }, { parent: self });
        }
        function createIntegration() {
            return new apigatewayv2.Integration(...transform(args.transform?.integration, `${name}Integration`, {
                apiId: api.id,
                integrationType: "AWS_PROXY",
                integrationUri: fn.arn.apply((arn) => {
                    const [, partition, , region] = arn.split(":");
                    return `arn:${partition}:apigateway:${region}:lambda:path/2015-03-31/functions/${arn}/invocations`;
                }),
            }, { parent: self, dependsOn: [permission] }));
        }
        function createApiRoute() {
            const authArgs = all([args.route, args.auth]).apply(([route, auth]) => {
                if (route !== "$connect")
                    return { authorizationType: "NONE" };
                if (!auth)
                    return { authorizationType: "NONE" };
                if (auth.iam)
                    return { authorizationType: "AWS_IAM" };
                if (auth.lambda)
                    return {
                        authorizationType: "CUSTOM",
                        authorizerId: auth.lambda,
                    };
                if (auth.jwt)
                    return {
                        authorizationType: "JWT",
                        authorizationScopes: auth.jwt.scopes,
                        authorizerId: auth.jwt.authorizer,
                    };
                return { authorizationType: "NONE" };
            });
            return authArgs.apply((authArgs) => new apigatewayv2.Route(...transform(args.transform?.route, `${name}Route`, {
                apiId: api.id,
                routeKey: route,
                target: interpolate `integrations/${integration.id}`,
                ...authArgs,
            }, { parent: self })));
        }
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        const self = this;
        return {
            /**
             * The Lambda function.
             */
            get function() {
                return self.fn.apply((fn) => fn.getFunction());
            },
            /**
             * The Lambda permission.
             */
            permission: this.permission,
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
const __pulumiType = "sst:aws:ApiGatewayWebSocketRoute";
// @ts-expect-error
ApiGatewayWebSocketRoute.__pulumiType = __pulumiType;
