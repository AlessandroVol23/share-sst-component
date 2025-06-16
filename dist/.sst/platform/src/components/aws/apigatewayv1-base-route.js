import { output } from "@pulumi/pulumi";
import { transform } from "../component";
import { apigateway } from "@pulumi/aws";
export function createMethod(name, args, parent) {
    const { api, method, resourceId, auth, apiKey } = args;
    const authArgs = output(auth).apply((auth) => {
        if (!auth)
            return { authorization: "NONE" };
        if (auth.iam)
            return { authorization: "AWS_IAM" };
        if (auth.custom)
            return { authorization: "CUSTOM", authorizerId: auth.custom };
        if (auth.cognito)
            return {
                authorization: "COGNITO_USER_POOLS",
                authorizerId: auth.cognito.authorizer,
                authorizationScopes: auth.cognito.scopes,
            };
        return { authorization: "NONE" };
    });
    return authArgs.apply((authArgs) => new apigateway.Method(...transform(args.transform?.method, `${name}Method`, {
        restApi: output(api).id,
        resourceId: resourceId,
        httpMethod: method,
        authorization: authArgs.authorization,
        authorizerId: authArgs.authorizerId,
        authorizationScopes: authArgs.authorizationScopes,
        apiKeyRequired: apiKey,
    }, { parent })));
}
