import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
interface KvDataEntry {
    source: string;
    key: string;
    hash: string;
    contentType: string;
    cacheControl?: string;
}
export interface KvDataInputs {
    accountId: Input<Inputs["accountId"]>;
    namespaceId: Input<Inputs["namespaceId"]>;
    entries: Input<Inputs["entries"]>;
}
interface Inputs {
    accountId: string;
    namespaceId: string;
    entries: KvDataEntry[];
}
export declare class KvData extends dynamic.Resource {
    constructor(name: string, args: KvDataInputs, opts?: CustomResourceOptions);
}
export {};
