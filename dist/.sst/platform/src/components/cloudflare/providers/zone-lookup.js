import { dynamic } from "@pulumi/pulumi";
import { cfFetch } from "../helpers/fetch.js";
class Provider {
    async create(inputs) {
        const { zoneId, zoneName } = await this.lookup(inputs);
        return { id: zoneId, outs: { zoneId, zoneName } };
    }
    async update(id, olds, news) {
        const { zoneId, zoneName } = await this.lookup(news);
        return { outs: { zoneId, zoneName } };
    }
    async lookup(inputs, page = 1) {
        try {
            const qs = new URLSearchParams({
                per_page: "50",
                "account.id": inputs.accountId,
            }).toString();
            const ret = await cfFetch(`/zones?${qs}`, { headers: { "Content-Type": "application/json" } });
            const zone = ret.result.find(
            // ensure `example.com` does not match `myexample.com`
            (z) => inputs.domain === z.name || inputs.domain.endsWith(`.${z.name}`));
            if (zone)
                return { zoneId: zone.id, zoneName: zone.name };
            if (ret.result.length < ret.result_info.per_page)
                throw new Error(`Could not find hosted zone for domain ${inputs.domain}`);
            return this.lookup(inputs, page + 1);
        }
        catch (error) {
            console.log(error);
            throw error;
        }
    }
}
export class ZoneLookup extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new Provider(), `${name}.sst.cloudflare.ZoneLookup`, { ...args, zoneId: undefined, zoneName: undefined }, opts);
    }
}
