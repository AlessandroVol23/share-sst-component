import { CustomResourceOptions, Output, dynamic } from "@pulumi/pulumi";
import { WorkersScriptArgs } from "@pulumi/cloudflare";
import { Input } from "../../input.js";
export interface WorkerScriptInputs extends Omit<WorkersScriptArgs, "content"> {
    content: Input<{
        filename: Input<string>;
        hash: Input<string>;
    }>;
}
export interface WorkerScript {
    scriptName: Output<string>;
}
export declare class WorkerScript extends dynamic.Resource {
    constructor(name: string, args: WorkerScriptInputs, opts?: CustomResourceOptions);
}
