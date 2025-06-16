import { FunctionPermissionArgs } from "./function";
export declare const URL_UNAVAILABLE = "http://url-unavailable-in-dev.mode";
/** @deprecated
 * instead try
 * ```
 * sst.Linkable.wrap(MyResource, (resource) => ({
 *   properties: { ... },
 *   with: [
 *     sst.aws.permission({ actions: ["foo:*"], resources: [resource.arn] })
 *   ]
 * }))
 * ```
 */
export declare function linkable<T>(obj: {
    new (...args: any[]): T;
}, cb: (resource: T) => FunctionPermissionArgs[]): void;
