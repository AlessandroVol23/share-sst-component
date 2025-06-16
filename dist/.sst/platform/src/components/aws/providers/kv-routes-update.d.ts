import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
export interface KvRoutesUpdateInputs {
    store: Input<string>;
    key: Input<string>;
    entry: Input<string>;
    namespace: Input<string>;
}
export declare class KvRoutesUpdate extends dynamic.Resource {
    constructor(name: string, args: KvRoutesUpdateInputs, opts?: CustomResourceOptions);
}
