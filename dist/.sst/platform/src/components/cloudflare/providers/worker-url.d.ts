import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
interface Inputs {
    accountId: string;
    scriptName: string;
    enabled: boolean;
}
interface Outputs {
    url: string | undefined;
}
export interface WorkerUrlInputs {
    accountId: Input<Inputs["accountId"]>;
    scriptName: Input<Inputs["scriptName"]>;
    enabled: Input<Inputs["enabled"]>;
}
export interface WorkerUrl {
    url: Output<Outputs["url"]>;
}
export declare class WorkerUrl extends dynamic.Resource {
    constructor(name: string, args: WorkerUrlInputs, opts?: CustomResourceOptions);
}
export {};
