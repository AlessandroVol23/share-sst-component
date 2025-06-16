import { interpolate, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { apigateway, lambda } from "@pulumi/aws";
import { createMethod, } from "./apigatewayv1-base-route";
import { functionBuilder } from "./helpers/function-builder";
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
export class ApiGatewayV1LambdaRoute extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const api = output(args.api);
        const method = createMethod(name, args, self);
        const fn = createFunction();
        const permission = createPermission();
        const integration = createIntegration();
        this.fn = fn;
        this.permission = permission;
        this.method = method;
        this.integration = integration;
        function createFunction() {
            const { method, path } = args;
            return functionBuilder(`${name}Handler`, args.handler, {
                description: interpolate `${api.name} route ${method} ${path}`,
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
            return new apigateway.Integration(...transform(args.transform?.integration, `${name}Integration`, {
                restApi: api.id,
                resourceId: args.resourceId,
                httpMethod: method.httpMethod,
                integrationHttpMethod: "POST",
                type: "AWS_PROXY",
                uri: fn.invokeArn,
            }, { parent: self, dependsOn: [permission] }));
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
const __pulumiType = "sst:aws:ApiGatewayV1LambdaRoute";
// @ts-expect-error
ApiGatewayV1LambdaRoute.__pulumiType = __pulumiType;
