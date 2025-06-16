import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
export interface KvKeysInputs {
    store: Input<string>;
    namespace: Input<string>;
    entries: Input<Record<string, Input<string>>>;
    purge: Input<boolean>;
}
export declare class KvKeys extends dynamic.Resource {
    constructor(name: string, args: KvKeysInputs, opts?: CustomResourceOptions);
}
