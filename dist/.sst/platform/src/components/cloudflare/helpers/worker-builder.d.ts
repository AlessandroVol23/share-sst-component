import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Transform } from "../../component";
import { Worker, WorkerArgs } from "../worker";
import * as cloudflare from "@pulumi/cloudflare";
export type WorkerBuilder = Output<{
    getWorker: () => Worker;
    script: cloudflare.WorkerScript;
}>;
export declare function workerBuilder(name: string, definition: Input<string | WorkerArgs>, argsTransform?: Transform<WorkerArgs>, opts?: ComponentResourceOptions): WorkerBuilder;
