import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
export class KvKeys extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Aws.KvKeys"), `${name}.sst.aws.KvKeys`, args, opts);
    }
}
