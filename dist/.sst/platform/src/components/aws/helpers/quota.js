import { servicequotas } from "@pulumi/aws";
import { useProvider } from "./provider";
const QUOTA_CODE = {
    "cloudfront-response-timeout": ["cloudfront", "L-AECE9FA7"],
};
const quotas = {};
export const CONSOLE_URL = "https://console.aws.amazon.com/support/home#/case/create?issueType=service-limit-increase";
export function getQuota(name) {
    if (quotas[name])
        return quotas[name];
    const quota = servicequotas.getServiceQuotaOutput({
        serviceCode: QUOTA_CODE[name][0],
        quotaCode: QUOTA_CODE[name][1],
    }, {
        provider: useProvider("us-east-1"),
    });
    quotas[name] = quota.value;
    return quota.value;
}
