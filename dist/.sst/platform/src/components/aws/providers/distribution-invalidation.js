import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
export class DistributionInvalidation extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Aws.DistributionInvalidation"), `${name}.sst.aws.DistributionInvalidation`, args, opts);
    }
}
