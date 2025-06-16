import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
export class DistributionDeploymentWaiter extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Aws.DistributionDeploymentWaiter"), `${name}.sst.aws.DistributionDeploymentWaiter`, args, opts);
    }
}
