import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
export class KvRoutesUpdate extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Aws.KvRoutesUpdate"), `${name}.sst.aws.KvRoutesUpdate`, args, opts);
    }
}
