import { Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { KvRoutesUpdate } from "./providers/kv-routes-update";
export interface RouterBaseRouteArgs {
    /**
     * The KV Namespace to use.
     */
    routerNamespace: Input<string>;
    /**
     * The KV Store to use.
     */
    store: Input<string>;
    /**
     * The pattern to match.
     */
    pattern: Input<string>;
}
export declare function parsePattern(pattern: string): {
    host: string;
    path: string;
};
export declare function buildKvNamespace(name: string): string;
export declare function createKvRouteData(name: string, args: RouterBaseRouteArgs, parent: Component, routeNs: string, data: any): void;
export declare function updateKvRoutes(name: string, args: RouterBaseRouteArgs, parent: Component, routeType: "url" | "bucket" | "site", routeNs: string, pattern: {
    host: string;
    path: string;
}): KvRoutesUpdate;
