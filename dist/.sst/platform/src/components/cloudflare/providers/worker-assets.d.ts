import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
export interface WorkerAssetsInputs {
    directory: Input<string>;
    scriptName: Input<string>;
    manifest: Input<Record<string, {
        hash: string;
        size: number;
        contentType: string;
    }>>;
}
export interface WorkerAssets {
    jwt: Output<string>;
    scriptName: Output<string>;
}
export declare class WorkerAssets extends dynamic.Resource {
    constructor(name: string, args: WorkerAssetsInputs, opts?: CustomResourceOptions);
}
