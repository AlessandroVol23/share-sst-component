import crypto from "crypto";
import { jsonStringify } from "@pulumi/pulumi";
import { KvRoutesUpdate } from "./providers/kv-routes-update";
import { KvKeys } from "./providers/kv-keys";
export function parsePattern(pattern) {
    const [host, ...path] = pattern.split("/");
    return {
        host: host
            .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
            .replace(/\*/g, ".*"), // Replace * with .*
        path: "/" + path.join("/"),
    };
}
export function buildKvNamespace(name) {
    // In the case multiple sites use the same kv store, we need to namespace the keys
    return crypto
        .createHash("md5")
        .update(`${$app.name}-${$app.stage}-${name}`)
        .digest("hex")
        .substring(0, 4);
}
export function createKvRouteData(name, args, parent, routeNs, data) {
    new KvKeys(`${name}RouteKey`, {
        store: args.store,
        namespace: routeNs,
        entries: {
            metadata: jsonStringify(data),
        },
        purge: false,
    }, { parent });
}
export function updateKvRoutes(name, args, parent, routeType, routeNs, pattern) {
    return new KvRoutesUpdate(`${name}RoutesUpdate`, {
        store: args.store,
        namespace: args.routerNamespace,
        key: "routes",
        entry: [routeType, routeNs, pattern.host, pattern.path].join(","),
    }, { parent });
}
