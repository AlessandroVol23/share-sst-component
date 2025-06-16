import { VisibleError } from "../error";
export const URL_UNAVAILABLE = "http://url-unavailable-in-dev.mode";
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
export function linkable(obj, cb) {
    throw new VisibleError([
        "sst.aws.linkable is deprecated. Use sst.Linkable.wrap instead.",
        "sst.Linkable.wrap(MyResource, (resource) => ({",
        "  properties: { ... },",
        "  with: [",
        '    sst.aws.permission({ actions: ["foo:*"], resources: [resource.arn] })',
        "  ]",
        "}))",
    ].join("\n"));
}
