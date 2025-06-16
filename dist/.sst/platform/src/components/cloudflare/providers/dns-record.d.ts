import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
export interface DnsRecordInputs {
    zoneId: Input<string>;
    type: Input<string>;
    name: Input<string>;
    value?: Input<string>;
    data?: Input<{
        flags: Input<string>;
        tag: Input<string>;
        value: Input<string>;
    }>;
    proxied?: Input<boolean>;
}
export interface DnsRecord {
    recordId: Output<string>;
}
export declare class DnsRecord extends dynamic.Resource {
    constructor(name: string, args: DnsRecordInputs, opts?: CustomResourceOptions);
}
