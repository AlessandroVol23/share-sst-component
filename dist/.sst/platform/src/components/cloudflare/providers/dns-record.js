import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
import { DEFAULT_ACCOUNT_ID } from "../account-id";
export class DnsRecord extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Cloudflare.DnsRecord"), `${name}.sst.cloudflare.DnsRecord`, {
            ...args,
            recordId: undefined,
            accountId: DEFAULT_ACCOUNT_ID,
            apiToken: $app.providers?.cloudflare?.apiToken ||
                process.env.CLOUDFLARE_API_TOKEN,
        }, opts);
    }
}
