import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
import { DEFAULT_ACCOUNT_ID } from "../account-id";
export class WorkerAssets extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Cloudflare.WorkerAssets"), `${name}.sst.cloudflare.WorkerAssets`, {
            ...args,
            jwt: undefined,
            accountId: DEFAULT_ACCOUNT_ID,
            apiToken: $app.providers?.cloudflare?.apiToken ||
                process.env.CLOUDFLARE_API_TOKEN,
            // always trigger an update b/c a new completion token is required
            timestamp: Date.now(),
        }, opts);
    }
}
