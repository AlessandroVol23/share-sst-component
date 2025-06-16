import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Function, FunctionArn, FunctionArgs } from "../function";
import { Transform } from "../../component";
export type FunctionBuilder = Output<{
    getFunction: () => Function;
    arn: Output<string>;
    invokeArn: Output<string>;
}>;
export declare function functionBuilder(name: string, definition: Input<string | FunctionArn | FunctionArgs>, defaultArgs: Pick<FunctionArgs, "description" | "link" | "environment" | "permissions" | "url" | "_skipHint">, argsTransform?: Transform<FunctionArgs>, opts?: ComponentResourceOptions): FunctionBuilder;
