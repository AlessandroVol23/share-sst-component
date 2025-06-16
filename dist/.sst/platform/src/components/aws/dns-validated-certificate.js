import { all } from "@pulumi/pulumi";
import { Component } from "../component";
import { acm } from "@pulumi/aws";
export class DnsValidatedCertificate extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const parent = this;
        const { domainName, alternativeNames, dns } = args;
        const certificate = createCertificate();
        const records = createDnsRecords();
        this.certificateValidation = validateCertificate();
        function createCertificate() {
            return new acm.Certificate(`${name}Certificate`, {
                domainName,
                validationMethod: "DNS",
                subjectAlternativeNames: alternativeNames ?? [],
            }, { parent });
        }
        function createDnsRecords() {
            return all([dns, domainName, certificate.domainValidationOptions]).apply(([dns, domainName, options]) => {
                // filter unique records
                const records = [];
                options = options.filter((option) => {
                    const key = option.resourceRecordType + option.resourceRecordName;
                    if (records.includes(key))
                        return false;
                    records.push(key);
                    return true;
                });
                // create CAA record if domain not hosted on Route53
                const caaRecords = dns.provider === "aws"
                    ? undefined
                    : dns.createCaa(name, domainName, { parent });
                // create records
                return options.map((option) => dns.createRecord(name, {
                    type: option.resourceRecordType,
                    name: option.resourceRecordName,
                    value: option.resourceRecordValue,
                }, { parent, dependsOn: caaRecords ? [...caaRecords] : [] }));
            });
        }
        function validateCertificate() {
            return new acm.CertificateValidation(`${name}Validation`, {
                certificateArn: certificate.arn,
            }, { parent, dependsOn: records });
        }
    }
    get arn() {
        return this.certificateValidation.certificateArn;
    }
}
const __pulumiType = "sst:aws:Certificate";
// @ts-expect-error
DnsValidatedCertificate.__pulumiType = __pulumiType;
