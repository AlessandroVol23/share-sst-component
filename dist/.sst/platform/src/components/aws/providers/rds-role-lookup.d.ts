import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
export interface RdsRoleLookupInputs {
    name: Input<string>;
}
export declare class RdsRoleLookup extends dynamic.Resource {
    constructor(name: string, args: RdsRoleLookupInputs, opts?: CustomResourceOptions);
}
