/**
 * The Vercel DNS Adapter is used to create DNS records to manage domains hosted on [Vercel](https://vercel.com/docs/projects/domains/working-with-domains).
 *
 * :::note
 * You need to [add the Vercel provider](/docs/all-providers#directory) to use this adapter.
 * :::
 *
 * This adapter is passed in as `domain.dns` when setting a custom domain; where `example.com`
 * is hosted on Vercel.
 *
 * ```ts
 * {
 *   domain: {
 *     name: "example.com",
 *     dns: sst.vercel.dns({
 *       domain: "example.com"
 *     })
 *   }
 * }
 * ```
 *
 * #### Configure provider
 *
 * 1. To use this component, add the `@pulumiverse/vercel` provider to your app.
 *
 *    ```bash
 *    sst add @pulumiverse/vercel
 *    ```
 *
 * 2. If you don't already have a Vercel Access Token, [follow this guide](https://vercel.com/guides/how-do-i-use-a-vercel-api-access-token#creating-an-access-token) to create one.
 *
 * 3. Add a `VERCEL_API_TOKEN` environment variable with the access token value. If the domain
 * belongs to a team, also add a `VERCEL_TEAM_ID` environment variable with the Team ID. You can
 * find your Team ID inside your team's general project settings in the Vercel dashboard.
 *
 * @packageDocumentation
 */
import { DnsRecordArgs } from "@pulumiverse/vercel";
import { DnsRecord as OverridableDnsRecord } from "./providers/dns-record";
import { AliasRecord, Record } from "../dns";
import { ComponentResourceOptions } from "@pulumi/pulumi";
import { Transform } from "../component";
import { Input } from "../input";
export interface DnsArgs {
    /**
     * The domain name in your Vercel account to create the record in.
     *
     * @example
     * ```js
     * {
     *   domain: "example.com"
     * }
     * ```
     */
    domain: Input<string>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Vercel record resource.
         */
        record?: Transform<DnsRecordArgs>;
    };
}
export declare function dns(args: DnsArgs): {
    provider: "vercel";
    createAlias: (namePrefix: string, record: AliasRecord, opts: ComponentResourceOptions) => import("@pulumi/pulumi").Output<import("@pulumiverse/vercel/dnsRecord").DnsRecord>;
    createCaa: (namePrefix: string, recordName: string, opts: ComponentResourceOptions) => OverridableDnsRecord[];
    createRecord: (namePrefix: string, record: Record, opts: ComponentResourceOptions) => import("@pulumi/pulumi").Output<import("@pulumiverse/vercel/dnsRecord").DnsRecord>;
};
