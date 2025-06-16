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
import { AliasRecord, Record } from "../dns";
import { ComponentResourceOptions } from "@pulumi/pulumi";
import { Transform } from "../component";
import { Input } from "../input";
import { route53 } from "@pulumi/aws";
export interface DnsArgs {
    /**
     * Set the hosted zone ID if you have multiple hosted zones that have the same
     * domain in Route 53.
     *
     * The 14 letter ID of the [Route 53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) that contains the `domainName`. You can find the hosted zone ID in the Route 53 part of the AWS Console.
     *
     * @example
     * ```js
     * {
     *   zone: "Z2FDTNDATAQYW2"
     * }
     * ```
     */
    zone?: Input<string>;
    /**
     * Set to `true` if you want to let the new DNS records replace the existing ones.
     *
     * :::tip
     * Use this to migrate over your domain without any downtime.
     * :::
     *
     * This is useful if your domain is currently used by another app and you want to switch it
     * to your current app. Without setting this, you'll first have to remove the existing DNS
     * records and then add the new one. This can cause downtime.
     *
     * You can avoid this by setting this to `true` and the existing DNS records will be replaced
     * without any downtime. Just make sure that when you remove your old app, you don't remove
     * the DNS records.
     *
     * @default `false`
     * @example
     * ```js
     * {
     *   override: true
     * }
     * ```
     */
    override?: Input<boolean>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the AWS Route 53 record resource.
         */
        record?: Transform<route53.RecordArgs>;
    };
}
export declare function dns(args?: DnsArgs): {
    provider: "aws";
    createAlias: (namePrefix: string, record: AliasRecord, opts: ComponentResourceOptions) => import("@pulumi/pulumi").Output<import("@pulumi/aws/route53/record").Record>[];
    createCaa: (namePrefix: string, recordName: string, opts: ComponentResourceOptions) => undefined;
    createRecord: (namePrefix: string, record: Record, opts: ComponentResourceOptions) => import("@pulumi/pulumi").Output<import("@pulumi/aws/route53/record").Record>;
};
