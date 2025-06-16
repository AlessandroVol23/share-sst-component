declare const QUOTA_CODE: {
    "cloudfront-response-timeout": string[];
};
export declare const CONSOLE_URL = "https://console.aws.amazon.com/support/home#/case/create?issueType=service-limit-increase";
export declare function getQuota(name: keyof typeof QUOTA_CODE): import("@pulumi/pulumi").OutputInstance<number>;
export {};
