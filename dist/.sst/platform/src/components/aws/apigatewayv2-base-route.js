import { interpolate, output } from "@pulumi/pulumi";
import { transform } from "../component";
import { apigatewayv2 } from "@pulumi/aws";
export function createApiRoute(name, args, integrationId, parent) {
    const authArgs = output(args.auth).apply((auth) => {
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
        apiId: output(args.api).id,
        routeKey: args.route,
        target: interpolate `integrations/${integrationId}`,
        ...authArgs,
    }, { parent })));
}
