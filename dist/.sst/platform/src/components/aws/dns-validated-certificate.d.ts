import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { Input } from "../input.js";
import { Dns } from "../dns";
/**
 * Properties to create a DNS validated certificate managed by AWS Certificate Manager.
 */
export interface DnsValidatedCertificateArgs {
    /**
     * The fully qualified domain name in the certificate.
     */
    domainName: Input<string>;
    /**
     * Set of domains that should be SANs in the issued certificate
     */
    alternativeNames?: Input<string[]>;
    /**
     * The DNS adapter you want to use for managing DNS records.
     */
    dns: Input<Dns & {}>;
}
export declare class DnsValidatedCertificate extends Component {
    private certificateValidation;
    constructor(name: string, args: DnsValidatedCertificateArgs, opts?: ComponentResourceOptions);
    get arn(): Output<string>;
}
