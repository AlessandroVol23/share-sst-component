import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
export class VectorTable extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Aws.VectorTable"), `${name}.sst.aws.VectorTable`, args, opts);
    }
}
