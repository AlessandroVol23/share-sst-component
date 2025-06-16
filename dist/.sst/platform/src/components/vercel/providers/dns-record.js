import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
export class DnsRecord extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Vercel.DnsRecord"), `${name}.sst.vercel.DnsRecord`, {
            ...args,
            recordId: undefined,
            teamId: process.env.VERCEL_TEAM_ID,
            apiToken: process.env.VERCEL_API_TOKEN,
        }, opts);
    }
}
