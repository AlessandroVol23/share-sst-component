import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
export class HostedZoneLookup extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Aws.HostedZoneLookup"), `${name}.sst.aws.HostedZoneLookup`, { ...args, zoneId: undefined }, opts);
    }
}
