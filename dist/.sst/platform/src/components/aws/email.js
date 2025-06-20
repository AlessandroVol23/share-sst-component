import { all, interpolate, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { dns as awsDns } from "./dns.js";
import { ses, sesv2 } from "@pulumi/aws";
import { permission } from "./permission";
/**
 * The `Email` component lets you send emails in your app.
 * It uses [Amazon Simple Email Service](https://aws.amazon.com/ses/).
 *
 * You can configure it to send emails from a specific email address or from any email addresses
 * in a domain.
 *
 * :::tip
 * New AWS SES accounts are in _sandbox mode_ and need to [request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).
 * :::
 *
 * By default, new AWS SES accounts are in the _sandbox mode_ and can only send
 * email to verified email addresses and domains. It also limits your account has to a sending
 * quota. To remove these restrictions, you need to [request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).
 *
 * #### Sending from an email address
 *
 * For using an email address as the sender, you need to verify the email address.
 *
 * ```ts title="sst.config.ts"
 * const email = new sst.aws.Email("MyEmail", {
 *   sender: "spongebob@example.com",
 * });
 * ```
 *
 * #### Sending from a domain
 *
 * When you use a domain as the sender, you'll need to verify that you own the domain.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Email("MyEmail", {
 *   sender: "example.com"
 * });
 * ```
 *
 * #### Configuring DMARC
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Email("MyEmail", {
 *   sender: "example.com",
 *   dmarc: "v=DMARC1; p=quarantine; adkim=s; aspf=s;"
 * });
 * ```
 *
 * #### Link to a resource
 *
 * You can link it to a function or your Next.js app to send emails.
 *
 * ```ts {3} title="sst.config.ts"
 * new sst.aws.Function("MyApi", {
 *   handler: "sender.handler",
 *   link: [email]
 * });
 * ```
 *
 * Now in your function you can use the AWS SES SDK to send emails.
 *
 * ```ts title="sender.ts" {1, 8}
 * import { Resource } from "sst";
 * import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
 *
 * const client = new SESv2Client();
 *
 * await client.send(
 *   new SendEmailCommand({
 *     FromEmailAddress: Resource.MyEmail.sender,
 *     Destination: {
 *       ToAddresses: ["patrick@example.com"]
 *     },
 *     Content: {
 *       Simple: {
 *         Subject: { Data: "Hello World!" },
 *         Body: { Text: { Data: "Sent from my SST app." } }
 *       }
 *     }
 *   })
 * );
 * ```
 */
export class Email extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        if (args && "ref" in args) {
            const ref = reference();
            this._sender = ref.identity.emailIdentity;
            this.identity = ref.identity;
            this.configurationSet = ref.configurationSet;
            return;
        }
        const isDomain = checkIsDomain();
        const dns = normalizeDns();
        const dmarc = normalizeDmarc();
        const configurationSet = createConfigurationSet();
        const identity = createIdentity();
        createEvents();
        isDomain.apply((isDomain) => {
            if (!isDomain)
                return;
            createDkimRecords();
            createDmarcRecord();
            waitForVerification();
        });
        this._sender = output(args.sender);
        this.identity = identity;
        this.configurationSet = configurationSet;
        function reference() {
            const ref = args;
            const identity = sesv2.EmailIdentity.get(`${name}Identity`, ref.sender, undefined, { parent: self });
            const configurationSet = sesv2.ConfigurationSet.get(`${name}Config`, identity.configurationSetName.apply((v) => v), undefined, { parent: self });
            return {
                identity,
                configurationSet,
            };
        }
        function checkIsDomain() {
            return output(args.sender).apply((sender) => !sender.includes("@"));
        }
        function normalizeDns() {
            all([args.dns, isDomain]).apply(([dns, isDomain]) => {
                if (!isDomain && dns)
                    throw new Error(`The "dns" property is only valid when "sender" is a domain.`);
            });
            return args.dns ?? awsDns();
        }
        function normalizeDmarc() {
            all([args.dmarc, isDomain]).apply(([dmarc, isDomain]) => {
                if (!isDomain && dmarc)
                    throw new Error(`The "dmarc" property is only valid when "sender" is a domain.`);
            });
            return args.dmarc ?? `v=DMARC1; p=none;`;
        }
        function createConfigurationSet() {
            return new sesv2.ConfigurationSet(...transform(args.transform?.configurationSet, `${name}Config`, { configurationSetName: "" }, { parent: self }));
        }
        function createIdentity() {
            return new sesv2.EmailIdentity(...transform(args.transform?.identity, `${name}Identity`, {
                emailIdentity: args.sender,
                configurationSetName: configurationSet.configurationSetName,
            }, { parent: self }));
        }
        function createEvents() {
            output(args.events ?? []).apply((events) => events.forEach((event) => {
                new sesv2.ConfigurationSetEventDestination(`${name}Event${event.name}`, {
                    configurationSetName: configurationSet.configurationSetName,
                    eventDestinationName: event.name,
                    eventDestination: {
                        matchingEventTypes: event.types.map((t) => t.toUpperCase().replaceAll("-", "_")),
                        ...(event.bus
                            ? { eventBridgeDestination: { eventBusArn: event.bus } }
                            : {}),
                        ...(event.topic
                            ? { snsDestination: { topicArn: event.topic } }
                            : {}),
                        enabled: true,
                    },
                }, { parent: self });
            }));
        }
        function createDkimRecords() {
            all([dns, identity?.dkimSigningAttributes.tokens]).apply(([dns, tokens]) => {
                if (!dns)
                    return;
                tokens?.map((token) => dns.createRecord(name, {
                    type: "CNAME",
                    name: interpolate `${token}._domainkey.${args.sender}`,
                    value: `${token}.dkim.amazonses.com`,
                }, { parent: self }));
            });
        }
        function createDmarcRecord() {
            output(dns).apply((dns) => {
                if (!dns)
                    return;
                dns.createRecord(name, {
                    type: "TXT",
                    name: interpolate `_dmarc.${args.sender}`,
                    value: dmarc,
                }, { parent: self });
            });
        }
        function waitForVerification() {
            new ses.DomainIdentityVerification(`${name}Verification`, {
                domain: args.sender,
            }, { parent: self, dependsOn: identity });
        }
    }
    /**
     * The sender email address or domain name.
     */
    get sender() {
        return this._sender;
    }
    /**
     * The name of the configuration set.
     */
    get configSet() {
        return this.configurationSet.configurationSetName;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon SES identity.
             */
            identity: this.identity,
            /**
             * The Amazon SES configuration set.
             */
            configurationSet: this.configurationSet,
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                sender: this._sender,
                configSet: this.configSet,
            },
            include: [
                permission({
                    actions: ["ses:*"],
                    resources: [this.identity.arn, this.configurationSet.arn],
                }),
                // When the SES account is in sandbox mode, it seems you have to include verified
                // receipients inside `resources`. Needs further investigation.
                permission({
                    actions: [
                        "ses:SendEmail",
                        "ses:SendRawEmail",
                        "ses:SendTemplatedEmail",
                    ],
                    resources: ["*"],
                }),
            ],
        };
    }
    /**
     * Reference an existing Email component with the given Amazon SES identity. This is useful
     * when you create an SES identity in one stage and want to share it in another stage. It
     * avoids having to create a new Email component in the other stage.
     *
     * @param name The name of the component.
     * @param sender The email address or domain name of the existing SES identity.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create an Email component in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new component, you want to share the one from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const email = $app.stage === "frank"
     *   ? sst.aws.Email.get("MyEmail", "spongebob@example.com")
     *   : new sst.aws.Email("MyEmail", {
     *       sender: "spongebob@example.com",
     *     });
     * ```
     */
    static get(name, sender, opts) {
        return new Email(name, {
            ref: true,
            sender,
        }, opts);
    }
}
const __pulumiType = "sst:aws:Email";
// @ts-expect-error
Email.__pulumiType = __pulumiType;
