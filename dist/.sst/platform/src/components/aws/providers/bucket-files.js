import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
export class BucketFiles extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Aws.BucketFiles"), `${name}.sst.aws.BucketFiles`, args, opts);
    }
}
