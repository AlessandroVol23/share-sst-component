import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
export interface DistributionDeploymentWaiterInputs {
    distributionId: Input<string>;
    etag: Input<string>;
    wait: Input<boolean>;
}
export interface DistributionDeploymentWaiter {
    isDone: Output<boolean>;
}
export declare class DistributionDeploymentWaiter extends dynamic.Resource {
    constructor(name: string, args: DistributionDeploymentWaiterInputs, opts?: CustomResourceOptions);
}
