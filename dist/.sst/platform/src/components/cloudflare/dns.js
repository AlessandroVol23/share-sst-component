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
import { logicalName } from "../naming";
import { ZoneLookup } from "./providers/zone-lookup";
import { output } from "@pulumi/pulumi";
import { transform } from "../component";
import { DEFAULT_ACCOUNT_ID } from "./account-id";
import { DnsRecord as OverridableDnsRecord } from "./providers/dns-record";
export function dns(args = {}) {
    return {
        provider: "cloudflare",
        createAlias,
        createCaa,
        createRecord,
    };
    function lookupZone(namePrefix, recordType, recordName, opts) {
        if (args.zone) {
            const zone = cloudflare.getZoneOutput({
                zoneId: args.zone,
            });
            return {
                id: zone.id,
                name: zone.name,
            };
        }
        const zone = new ZoneLookup(`${namePrefix}${recordType}${recordName}ZoneLookup`, {
            accountId: DEFAULT_ACCOUNT_ID,
            domain: recordName.replace(/\.$/, ""),
        }, opts);
        return {
            id: zone.zoneId,
            name: zone.zoneName,
        };
    }
    function createAlias(namePrefix, record, opts) {
        return handleCreate(namePrefix, {
            name: record.name,
            type: "CNAME",
            value: record.aliasName,
            isAlias: true,
        }, opts);
    }
    function createCaa(namePrefix, recordName, opts) {
        const zone = lookupZone(namePrefix, "CAA", recordName, opts);
        // Need to use the OverridableDnsRecord instead of the cloudflare.Record because
        // "allowOverride" does not work properly. When CAA records exist, the Terraform
        // provider will do a look up on existing records and only ignore the error if
        // there is exactly one match. But in our cases, there are two matches:
        // 1. CAA 0 issue "amazonaws.com"
        // 2. CAA 0 issuewild "amazonaws.com"
        // There can also be others ie. CAA 0 issue "letsencrypt.org"
        // So we need to use the OverridableDnsRecord to properly ignore existing records.
        return [
            new OverridableDnsRecord(`${namePrefix}CAA${recordName}Record`, {
                zoneId: zone.id,
                type: "CAA",
                name: zone.name,
                data: {
                    flags: "0",
                    tag: "issue",
                    value: "amazonaws.com",
                },
            }, opts),
            new OverridableDnsRecord(`${namePrefix}CAAWildcard${recordName}Record`, {
                zoneId: zone.id,
                type: "CAA",
                name: zone.name,
                data: {
                    flags: "0",
                    tag: "issuewild",
                    value: "amazonaws.com",
                },
            }, opts),
        ];
    }
    function createRecord(namePrefix, record, opts) {
        return handleCreate(namePrefix, record, opts);
    }
    function handleCreate(namePrefix, record, opts) {
        return output(record).apply((record) => {
            const zone = lookupZone(namePrefix, record.type, record.name, opts);
            const proxy = output(args.proxy).apply((proxy) => (proxy && record.isAlias) ?? false);
            const nameSuffix = logicalName(record.name);
            const type = record.type.toUpperCase();
            return new cloudflare.DnsRecord(...transform(args.transform?.record, `${namePrefix}${record.type}Record${nameSuffix}`, {
                zoneId: zone.id,
                proxied: output(proxy),
                type,
                name: record.name,
                ...(type === "TXT"
                    ? {
                        content: record.value.startsWith(`"`)
                            ? record.value
                            : `"${record.value}"`,
                    }
                    : {
                        content: record.value,
                    }),
                ttl: output(proxy).apply((proxy) => (proxy ? 1 : 60)),
            }, opts));
        });
    }
}
