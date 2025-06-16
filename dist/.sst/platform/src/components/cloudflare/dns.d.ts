/**
 * The Cloudflare DNS Adapter is used to create DNS records to manage domains hosted on
 * [Cloudflare DNS](https://developers.cloudflare.com/dns/).
 *
 * :::note
 * You need to [add the Cloudflare provider](/docs/providers/#install) to use this adapter.
 * :::
 *
 * This needs the Cloudflare provider. To add it run:
 *
 * ```bash
 * sst add cloudflare
 * ```
 *
 * This adapter is passed in as `domain.dns` when setting a custom domain, where `example.com`
 * is hosted on Cloudflare.
 *
 * ```ts
 * {
 *   domain: {
 *     name: "example.com",
 *     dns: sst.cloudflare.dns()
 *   }
 * }
 * ```
 *
 * Specify the zone ID.
 *
 * ```ts
 * {
 *   domain: {
 *     name: "example.com",
 *     dns: sst.cloudflare.dns({
 *       zone: "415e6f4653b6d95b775d350f32119abb"
 *     })
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */
import * as cloudflare from "@pulumi/cloudflare";
import { AliasRecord, Record } from "../dns";
import { ComponentResourceOptions } from "@pulumi/pulumi";
import { Transform } from "../component";
import { Input } from "../input";
import { DnsRecord as OverridableDnsRecord } from "./providers/dns-record";
export interface DnsArgs {
    /**
     * The ID of the Cloudflare zone to create the record in.
     *
     * @example
     * ```js
     * {
     *   zone: "415e6f4653b6d95b775d350f32119abb"
     * }
     * ```
     */
    zone?: Input<string>;
    /**
     * Configure ALIAS DNS records as [proxy records](https://developers.cloudflare.com/learning-paths/get-started-free/onboarding/proxy-dns-records/).
     *
     * :::tip
     * Proxied records help prevent DDoS attacks and allow you to use Cloudflare's global
     * content delivery network (CDN) for caching.
     * :::
     *
     * @default `false`
     * @example
     * ```js
     * {
     *   proxy: true
     * }
     * ```
     */
    proxy?: Input<boolean>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Cloudflare record resource.
         */
        record?: Transform<cloudflare.RecordArgs>;
    };
}
export declare function dns(args?: DnsArgs): {
    provider: "cloudflare";
    createAlias: (namePrefix: string, record: AliasRecord, opts: ComponentResourceOptions) => import("@pulumi/pulumi").Output<import("@pulumi/cloudflare/dnsRecord").DnsRecord>;
    createCaa: (namePrefix: string, recordName: string, opts: ComponentResourceOptions) => OverridableDnsRecord[];
    createRecord: (namePrefix: string, record: Record, opts: ComponentResourceOptions) => import("@pulumi/pulumi").Output<import("@pulumi/cloudflare/dnsRecord").DnsRecord>;
};
