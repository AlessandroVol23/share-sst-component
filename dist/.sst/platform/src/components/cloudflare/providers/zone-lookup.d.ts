import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
interface Inputs {
    accountId: string;
    domain: string;
}
interface Outputs {
    zoneId: string;
    zoneName: string;
}
export interface ZoneLookupInputs {
    accountId: Input<Inputs["accountId"]>;
    domain: Input<Inputs["domain"]>;
}
export interface ZoneLookup {
    zoneId: Output<Outputs["zoneId"]>;
    zoneName: Output<Outputs["zoneName"]>;
}
export declare class ZoneLookup extends dynamic.Resource {
    constructor(name: string, args: ZoneLookupInputs, opts?: CustomResourceOptions);
}
export {};
