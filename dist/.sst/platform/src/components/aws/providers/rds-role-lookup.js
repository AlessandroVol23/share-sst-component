import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
export class RdsRoleLookup extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Aws.RdsRoleLookup"), `${name}.sst.aws.RdsRoleLookup`, args, opts);
    }
}
