import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
export interface DnsRecordInputs {
    domain: Input<string>;
    type: Input<string>;
    name: Input<string>;
    value: Input<string>;
}
export interface DnsRecord {
    recordId: Output<string>;
}
export declare class DnsRecord extends dynamic.Resource {
    constructor(name: string, args: DnsRecordInputs, opts?: CustomResourceOptions);
}
