import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
export interface DistributionInvalidationInputs {
    distributionId: Input<string>;
    paths: Input<string[]>;
    wait: Input<boolean>;
    version: Input<string>;
}
export declare class DistributionInvalidation extends dynamic.Resource {
    constructor(name: string, args: DistributionInvalidationInputs, opts?: CustomResourceOptions);
}
