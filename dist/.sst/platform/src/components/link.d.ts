import { Input, Output, ComponentResource } from "@pulumi/pulumi";
export declare namespace Link {
    interface Definition<Properties extends Record<string, any> = Record<string, any>> {
        properties: Properties;
        include?: {
            type: string;
            [key: string]: any;
        }[];
    }
    class Ref extends ComponentResource {
        constructor(target: string, type: string, properties: any, include?: any);
    }
    function reset(): void;
    interface Linkable {
        urn: Output<string>;
        getSSTLink(): Definition;
    }
    function isLinkable(obj: any): obj is Linkable;
    function build(links: any[]): Output<{
        name: any;
        properties: {
            type: any;
        };
    }>[];
    function getProperties(links?: Input<any[]>): Output<any>;
    function propertiesToEnv(properties: ReturnType<typeof getProperties>): Output<{
        [k: string]: string;
    }>;
    function getInclude<T>(type: string, input?: Input<any[]>): Output<T[]>;
    /** @deprecated
     * Use sst.Linkable.wrap instead.
     */
    function linkable<T>(obj: {
        new (...args: any[]): T;
    }, cb: (resource: T) => Definition): void;
}
