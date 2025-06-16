import { CustomResourceOptions, dynamic, Input } from "@pulumi/pulumi";
export interface OriginAccessControlInputs {
    name: Input<string>;
}
export declare class OriginAccessControl extends dynamic.Resource {
    constructor(name: string, args: OriginAccessControlInputs, opts?: CustomResourceOptions);
}
