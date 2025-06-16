import { output, interpolate, all, } from "@pulumi/pulumi";
import { DnsValidatedCertificate } from "./dns-validated-certificate.js";
import { HttpsRedirect } from "./https-redirect.js";
import { useProvider } from "./helpers/provider.js";
import { Component, transform } from "../component.js";
import { DistributionDeploymentWaiter } from "./providers/distribution-deployment-waiter.js";
import { dns as awsDns } from "./dns.js";
import { cloudfront } from "@pulumi/aws";
import { logicalName } from "../naming.js";
/**
 * The `Cdn` component is internally used by other components to deploy a CDN to AWS. It uses [Amazon CloudFront](https://aws.amazon.com/cloudfront/) and [Amazon Route 53](https://aws.amazon.com/route53/) to manage custom domains.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * @example
 *
 * You'll find this component exposed in the `transform` of other components. And you can customize the args listed here. For example:
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   transform: {
 *     cdn: (args) => {
 *       args.wait = false;
 *     }
 *   }
 * });
 * ```
 */
export class Cdn extends Component {
    constructor(name, args, opts) {
        super(pulumiType, name, args, opts);
        const parent = this;
        if (args && "ref" in args) {
            const ref = reference();
            this.distribution = output(ref.distribution);
            this._domainUrl = ref.distribution.aliases.apply((aliases) => aliases?.length ? `https://${aliases[0]}` : undefined);
            return;
        }
        const domain = normalizeDomain();
        const certificateArn = createSsl();
        const distribution = createDistribution();
        const waiter = createDistributionDeploymentWaiter();
        createDnsRecords();
        createRedirects();
        this.distribution = waiter.isDone.apply(() => distribution);
        this._domainUrl = domain?.name
            ? interpolate `https://${domain.name}`
            : output(undefined);
        function reference() {
            const ref = args;
            const distribution = cloudfront.Distribution.get(`${name}Distribution`, ref.distributionID, undefined, { parent });
            return { distribution };
        }
        function normalizeDomain() {
            if (!args.domain)
                return;
            return output(args.domain).apply((domain) => {
                const norm = typeof domain === "string" ? { name: domain } : domain;
                // validate
                if (!norm.name)
                    throw new Error(`Missing "name" for domain.`);
                if (norm.dns === false && !norm.cert)
                    throw new Error(`Need to provide a validated certificate via "cert" when DNS is disabled`);
                return {
                    name: norm.name,
                    aliases: norm.aliases ?? [],
                    redirects: norm.redirects ?? [],
                    dns: norm.dns === false ? undefined : norm.dns ?? awsDns(),
                    cert: norm.cert,
                };
            });
        }
        function createSsl() {
            if (!domain)
                return output(undefined);
            return domain.cert.apply((cert) => {
                if (cert)
                    return domain.cert;
                // Certificates used for CloudFront distributions are required to be
                // created in the us-east-1 region
                return new DnsValidatedCertificate(`${name}Ssl`, {
                    domainName: domain.name,
                    alternativeNames: domain.aliases,
                    dns: domain.dns.apply((dns) => dns),
                }, { parent, provider: useProvider("us-east-1") }).arn;
            });
        }
        function createDistribution() {
            return new cloudfront.Distribution(...transform(args.transform?.distribution, `${name}Distribution`, {
                comment: args.comment,
                enabled: true,
                origins: args.origins,
                originGroups: args.originGroups,
                defaultCacheBehavior: args.defaultCacheBehavior,
                orderedCacheBehaviors: args.orderedCacheBehaviors,
                defaultRootObject: args.defaultRootObject,
                customErrorResponses: args.customErrorResponses,
                restrictions: {
                    geoRestriction: {
                        restrictionType: "none",
                    },
                },
                aliases: domain
                    ? output(domain).apply((domain) => [
                        domain.name,
                        ...domain.aliases,
                    ])
                    : [],
                viewerCertificate: certificateArn.apply((arn) => arn
                    ? {
                        acmCertificateArn: arn,
                        sslSupportMethod: "sni-only",
                        minimumProtocolVersion: "TLSv1.2_2021",
                    }
                    : {
                        cloudfrontDefaultCertificate: true,
                    }),
                waitForDeployment: false,
                tags: args.tags,
            }, { parent }));
        }
        function createDistributionDeploymentWaiter() {
            return output(args.wait).apply((wait) => {
                return new DistributionDeploymentWaiter(`${name}Waiter`, {
                    distributionId: distribution.id,
                    etag: distribution.etag,
                    wait: wait ?? true,
                }, { parent, ignoreChanges: wait ? undefined : ["*"] });
            });
        }
        function createDnsRecords() {
            if (!domain)
                return;
            domain.apply((domain) => {
                if (!domain.dns)
                    return;
                const existing = [];
                for (const [i, recordName] of [
                    domain.name,
                    ...domain.aliases,
                ].entries()) {
                    // Note: The way `dns` is implemented, the logical name for the DNS record is
                    // based on the sanitized version of the record name (ie. logicalName()). This
                    // means the logical name for `*.sst.sh` and `sst.sh` will trash b/c `*.` is
                    // stripped out.
                    // ```
                    // domain: {
                    //   name: "*.sst.sh",
                    //   aliases: ['sst.sh'],
                    // },
                    // ```
                    //
                    // Ideally, we don't sanitize the logical name. But that's a breaking change.
                    //
                    // As a workaround, starting v3.0.79, we prefix the logical name with a unique
                    // index for records with logical names that will trash.
                    const key = logicalName(recordName);
                    const namePrefix = existing.includes(key) ? `${name}${i}` : name;
                    existing.push(key);
                    domain.dns.createAlias(namePrefix, {
                        name: recordName,
                        aliasName: distribution.domainName,
                        aliasZone: distribution.hostedZoneId,
                    }, { parent });
                }
            });
        }
        function createRedirects() {
            if (!domain)
                return;
            all([domain.cert, domain.redirects, domain.dns]).apply(([cert, redirects, dns]) => {
                if (!redirects.length)
                    return;
                new HttpsRedirect(`${name}Redirect`, {
                    sourceDomains: redirects,
                    targetDomain: domain.name,
                    cert: cert ? domain.cert.apply((cert) => cert) : undefined,
                    dns: dns ? domain.dns.apply((dns) => dns) : undefined,
                }, { parent });
            });
        }
    }
    /**
     * The CloudFront URL of the distribution.
     */
    get url() {
        return interpolate `https://${this.distribution.domainName}`;
    }
    /**
     * If the custom domain is enabled, this is the URL of the distribution with the
     * custom domain.
     */
    get domainUrl() {
        return this._domainUrl;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon CloudFront distribution.
             */
            distribution: this.distribution,
        };
    }
    /**
     * Reference an existing CDN with the given distribution ID. This is useful when
     * you create a Router in one stage and want to share it in another. It avoids having to
     * create a new Router in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share Routers across stages.
     * :::
     *
     * @param name The name of the component.
     * @param distributionID The id of the existing CDN distribution.
     * @param opts? Resource options.
     */
    static get(name, distributionID, opts) {
        return new Cdn(name, {
            ref: true,
            distributionID,
        }, opts);
    }
}
const pulumiType = "sst:aws:CDN";
// @ts-expect-error
Cdn.__pulumiType = pulumiType;
