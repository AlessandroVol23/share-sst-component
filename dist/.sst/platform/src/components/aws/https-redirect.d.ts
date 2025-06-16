import { ComponentResourceOptions } from "@pulumi/pulumi";
import { Component } from "../component.js";
import { Input } from "../input.js";
import { Dns } from "../dns.js";
/**
 * Properties to configure an HTTPS Redirect
 */
export interface HttpsRedirectArgs {
    /**
     * The redirect target fully qualified domain name (FQDN). An alias record
     * will be created that points to your CloudFront distribution. Root domain
     * or sub-domain can be supplied.
     */
    targetDomain: Input<string>;
    /**
     * The domain names that will redirect to `targetDomain`
     *
     * @default Domain name of the hosted zone
     */
    sourceDomains: Input<string[]>;
    /**
     * The ARN of an ACM (AWS Certificate Manager) certificate that proves ownership of the
     * domain. By default, a certificate is created and validated automatically.
     */
    cert?: Input<string>;
    /**
     * The DNS adapter you want to use for managing DNS records.
     */
    dns?: Input<Dns & {}>;
}
/**
 * Allows creating a domainA -> domainB redirect using CloudFront and S3.
 * You can specify multiple domains to be redirected.
 */
export declare class HttpsRedirect extends Component {
    constructor(name: string, args: HttpsRedirectArgs, opts?: ComponentResourceOptions);
}
