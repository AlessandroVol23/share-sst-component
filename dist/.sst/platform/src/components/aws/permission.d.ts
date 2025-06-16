/**
 * The AWS Permission Linkable helper is used to define the AWS permissions included with the
 * [`sst.Linkable`](/docs/component/linkable/) component.
 *
 * @example
 *
 * ```ts
 * sst.aws.permission({
 *   actions: ["lambda:InvokeFunction"],
 *   resources: ["*"]
 * })
 * ```
 *
 * @packageDocumentation
 */
import { Prettify } from "../component.js";
import { FunctionPermissionArgs } from "./function.js";
export interface InputArgs extends Prettify<FunctionPermissionArgs> {
}
export declare function permission(input: InputArgs): {
    effect?: "allow" | "deny" | undefined;
    actions: string[];
    resources: import("../input.js").Input<import("../input.js").Input<string>[]>;
    type: "aws.permission";
};
export type Permission = ReturnType<typeof permission>;
