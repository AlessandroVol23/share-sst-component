import { getPartitionOutput, apigateway, iam } from "@pulumi/aws";
import { jsonStringify, interpolate, } from "@pulumi/pulumi";
export function setupApiGatewayAccount(namePrefix, opts) {
    const account = apigateway.Account.get(`${namePrefix}APIGatewayAccount`, "APIGatewayAccount", undefined, { provider: opts.provider });
    return account.cloudwatchRoleArn.apply((arn) => {
        if (arn)
            return account;
        const partition = getPartitionOutput(undefined, opts).partition;
        const role = new iam.Role(`APIGatewayPushToCloudWatchLogsRole`, {
            assumeRolePolicy: jsonStringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Principal: {
                            Service: "apigateway.amazonaws.com",
                        },
                        Action: "sts:AssumeRole",
                    },
                ],
            }),
            managedPolicyArns: [
                interpolate `arn:${partition}:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs`,
            ],
        }, { retainOnDelete: true, provider: opts.provider });
        return new apigateway.Account(`${namePrefix}APIGatewayAccountSetup`, {
            cloudwatchRoleArn: role.arn,
        }, { provider: opts.provider });
    });
}
