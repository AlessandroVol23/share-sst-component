import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
export class OriginAccessControl extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Aws.OriginAccessControl"), `${name}.sst.aws.OriginAccessControl`, args, opts);
    }
}
