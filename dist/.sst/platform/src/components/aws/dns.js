/**
 * The AWS DNS Adapter is used to create DNS records to manage domains hosted on
 * [Route 53](https://aws.amazon.com/route53/).
 *
 * This adapter is passed in as `domain.dns` when setting a custom domain.
 *
 * @example
 *
 * ```ts
 * {
 *   domain: {
 *     name: "example.com",
 *     dns: sst.aws.dns()
 *   }
 * }
 * ```
 *
 * You can also specify a hosted zone ID if you have multiple hosted zones with the same domain.
 *
 * ```ts
 * {
 *   domain: {
 *     name: "example.com",
 *     dns: sst.aws.dns({
 *       zone: "Z2FDTNDATAQYW2"
 *     })
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */
import { logicalName } from "../naming";
import { HostedZoneLookup } from "./providers/hosted-zone-lookup";
import { output } from "@pulumi/pulumi";
import { transform } from "../component";
import { route53 } from "@pulumi/aws";
import { VisibleError } from "../error";
export function dns(args = {}) {
    return {
        provider: "aws",
        createAlias,
        createCaa,
        createRecord,
    };
    /**
     * Creates alias records in the hosted zone.
     *
     * @param namePrefix The prefix to use for the resource names.
     * @param record The alias record to create.
     * @param opts The component resource options.
     */
    function createAlias(namePrefix, record, opts) {
        return ["A", "AAAA"].map((type) => _createRecord(namePrefix, {
            type,
            name: record.name,
            aliases: [
                {
                    name: record.aliasName,
                    zoneId: record.aliasZone,
                    evaluateTargetHealth: true,
                },
            ],
        }, opts));
    }
    function createCaa(namePrefix, recordName, opts) {
        // placeholder
        return undefined;
    }
    /**
     * Creates a DNS record in the hosted zone.
     *
     * @param namePrefix The prefix to use for the resource names.
     * @param record The DNS record to create.
     * @param opts The component resource options.
     */
    function createRecord(namePrefix, record, opts) {
        return _createRecord(namePrefix, {
            type: record.type,
            name: record.name,
            ttl: 60,
            records: [record.value],
        }, opts);
    }
    function _createRecord(namePrefix, partial, opts) {
        return output(partial).apply((partial) => {
            const nameSuffix = logicalName(partial.name);
            const zoneId = lookupZone();
            const dnsRecord = createRecord();
            return dnsRecord;
            function lookupZone() {
                if (args.zone) {
                    return output(args.zone).apply(async (zoneId) => {
                        const zone = await route53.getZone({ zoneId });
                        if (!partial.name.replace(/\.$/, "").endsWith(zone.name)) {
                            throw new VisibleError(`The DNS record "${partial.name}" cannot be created because the domain name does not match the hosted zone "${zone.name}" (${zoneId}).`);
                        }
                        return zoneId;
                    });
                }
                return new HostedZoneLookup(`${namePrefix}${partial.type}ZoneLookup${nameSuffix}`, {
                    domain: output(partial.name).apply((name) => name.replace(/\.$/, "")),
                }, opts).zoneId;
            }
            function createRecord() {
                return new route53.Record(...transform(args.transform?.record, `${namePrefix}${partial.type}Record${nameSuffix}`, {
                    zoneId,
                    allowOverwrite: args.override,
                    ...partial,
                }, opts));
            }
        });
    }
}
