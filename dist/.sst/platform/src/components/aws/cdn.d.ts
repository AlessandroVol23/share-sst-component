import { Output, ComponentResourceOptions } from "@pulumi/pulumi";
import { Component, Prettify, Transform } from "../component.js";
import { Input } from "../input.js";
import { Dns } from "../dns.js";
import { cloudfront } from "@pulumi/aws";
export interface CdnDomainArgs {
    /**
     * The custom domain you want to use.
     *
     * @example
     * ```js
     * {
     *   domain: {
     *     name: "example.com"
     *   }
     * }
     * ```
     *
     * Can also include subdomains based on the current stage.
     *
     * ```js
     * {
     *   domain: {
     *     name: `${$app.stage}.example.com`
     *   }
     * }
     * ```
     */
    name: Input<string>;
    /**
     * Alternate domains to be used. Visitors to the alternate domains will be redirected to the
     * main `name`.
     *
     * :::note
     * Unlike the `aliases` option, this will redirect visitors back to the main `name`.
     * :::
     *
     * @example
     * Use this to create a `www.` version of your domain and redirect visitors to the apex domain.
     * ```js {4}
     * {
     *   domain: {
     *     name: "domain.com",
     *     redirects: ["www.domain.com"]
     *   }
     * }
     * ```
     */
    redirects?: Input<string[]>;
    /**
     * Alias domains that should be used. Unlike the `redirect` option, this keeps your visitors
     * on this alias domain.
     *
     * @example
     * So if your users visit `app2.domain.com`, they will stay on `app2.domain.com` in their
     * browser.
     * ```js {4}
     * {
     *   domain: {
     *     name: "app1.domain.com",
     *     aliases: ["app2.domain.com"]
     *   }
     * }
     * ```
     */
    aliases?: Input<string[]>;
    /**
     * The ARN of an ACM (AWS Certificate Manager) certificate that proves ownership of the
     * domain. By default, a certificate is created and validated automatically.
     *
     * The certificate will be created in the `us-east-1` region as required by AWS CloudFront.
     * If you are creating your own certificate, you must also create it in `us-east-1`.
     *
     * :::tip
     * You need to pass in a `cert` for domains that are not hosted on supported `dns` providers.
     * :::
     *
     * To manually set up a domain on an unsupported provider, you'll need to:
     *
     * 1. [Validate that you own the domain](https://docs.aws.amazon.com/acm/latest/userguide/domain-ownership-validation.html) by creating an ACM certificate. You can either validate it by setting a DNS record or by verifying an email sent to the domain owner.
     * 2. Once validated, set the certificate ARN as the `cert` and set `dns` to `false`.
     * 3. Add the DNS records in your provider to point to the CloudFront distribution URL.
     *
     * @example
     * ```js
     * {
     *   domain: {
     *     name: "domain.com",
     *     dns: false,
     *     cert: "arn:aws:acm:us-east-1:112233445566:certificate/3a958790-8878-4cdc-a396-06d95064cf63"
     *   }
     * }
     * ```
     */
    cert?: Input<string>;
    /**
     * The DNS provider to use for the domain. Defaults to the AWS.
     *
     * Takes an adapter that can create the DNS records on the provider. This can automate
     * validating the domain and setting up the DNS routing.
     *
     * Supports Route 53, Cloudflare, and Vercel adapters. For other providers, you'll need
     * to set `dns` to `false` and pass in a certificate validating ownership via `cert`.
     *
     * @default `sst.aws.dns`
     *
     * @example
     *
     * Specify the hosted zone ID for the Route 53 domain.
     *
     * ```js
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
     * Use a domain hosted on Cloudflare, needs the Cloudflare provider.
     *
     * ```js
     * {
     *   domain: {
     *     name: "example.com",
     *     dns: sst.cloudflare.dns()
     *   }
     * }
     * ```
     *
     * Use a domain hosted on Vercel, needs the Vercel provider.
     *
     * ```js
     * {
     *   domain: {
     *     name: "example.com",
     *     dns: sst.vercel.dns()
     *   }
     * }
     * ```
     */
    dns?: Input<false | (Dns & {})>;
}
export interface CdnArgs {
    /**
     * A comment to describe the distribution. It cannot be longer than 128 characters.
     */
    comment?: Input<string>;
    /**
     * One or more origins for this distribution.
     */
    origins: cloudfront.DistributionArgs["origins"];
    /**
     * One or more origin groups for this distribution.
     */
    originGroups?: cloudfront.DistributionArgs["originGroups"];
    /**
     * The default cache behavior for this distribution.
     */
    defaultCacheBehavior: cloudfront.DistributionArgs["defaultCacheBehavior"];
    /**
     * An ordered list of cache behaviors for this distribution. Listed in order of precedence. The first cache behavior will have precedence 0.
     */
    orderedCacheBehaviors?: cloudfront.DistributionArgs["orderedCacheBehaviors"];
    /**
     * An object you want CloudFront to return when a user requests the root URL. For example, the `index.html`.
     */
    defaultRootObject?: cloudfront.DistributionArgs["defaultRootObject"];
    /**
     * One or more custom error responses.
     */
    customErrorResponses?: cloudfront.DistributionArgs["customErrorResponses"];
    /**
     * Set a custom domain for your distribution.
     *
     * Automatically manages domains hosted on AWS Route 53, Cloudflare, and Vercel. For other
     * providers, you'll need to pass in a `cert` that validates domain ownership and add the
     * DNS records.
     *
     * :::tip
     * Built-in support for AWS Route 53, Cloudflare, and Vercel. And manual setup for other
     * providers.
     * :::
     *
     * @example
     *
     * By default this assumes the domain is hosted on Route 53.
     *
     * ```js
     * {
     *   domain: "example.com"
     * }
     * ```
     *
     * For domains hosted on Cloudflare.
     *
     * ```js
     * {
     *   domain: {
     *     name: "example.com",
     *     dns: sst.cloudflare.dns()
     *   }
     * }
     * ```
     *
     * Specify a `www.` version of the custom domain.
     *
     * ```js
     * {
     *   domain: {
     *     name: "domain.com",
     *     redirects: ["www.domain.com"]
     *   }
     * }
     * ```
     */
    domain?: Input<string | Prettify<CdnDomainArgs>>;
    /**
     * Whether to wait for the CloudFront distribution to be deployed before
     * completing the deployment of the app. This is necessary if you need to use the
     * distribution URL in other resources.
     * @default `true`
     */
    wait?: Input<boolean>;
    /**
     * Tags to apply to the distribution.
     */
    tags?: Input<Record<string, Input<string>>>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying resources.
     */
    transform?: {
        /**
         * Transform the CloudFront distribution resource.
         */
        distribution: Transform<cloudfront.DistributionArgs>;
    };
}
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
export declare class Cdn extends Component {
    private distribution;
    private _domainUrl;
    constructor(name: string, args: CdnArgs, opts?: ComponentResourceOptions);
    /**
     * The CloudFront URL of the distribution.
     */
    get url(): Output<string>;
    /**
     * If the custom domain is enabled, this is the URL of the distribution with the
     * custom domain.
     */
    get domainUrl(): Output<string | undefined>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon CloudFront distribution.
         */
        distribution: Output<import("@pulumi/aws/cloudfront/distribution.js").Distribution>;
    };
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
    static get(name: string, distributionID: Input<string>, opts?: ComponentResourceOptions): Cdn;
}
