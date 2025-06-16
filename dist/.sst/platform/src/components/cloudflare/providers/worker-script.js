import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
import { DEFAULT_ACCOUNT_ID } from "../account-id.js";
export class WorkerScript extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Cloudflare.WorkerScript"), `${name}.sst.cloudflare.WorkerScript`, {
            ...args,
            accountId: DEFAULT_ACCOUNT_ID,
            apiToken: $app.providers?.cloudflare?.apiToken ||
                process.env.CLOUDFLARE_API_TOKEN,
        }, {
            ...opts,
            replaceOnChanges: ["scriptName"],
        });
    }
}
