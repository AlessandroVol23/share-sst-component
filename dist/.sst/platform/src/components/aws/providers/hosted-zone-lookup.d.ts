import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
export interface HostedZoneLookupInputs {
    domain: Input<string>;
}
export interface HostedZoneLookup {
    zoneId: Output<string>;
}
export declare class HostedZoneLookup extends dynamic.Resource {
    constructor(name: string, args: HostedZoneLookupInputs, opts?: CustomResourceOptions);
}
