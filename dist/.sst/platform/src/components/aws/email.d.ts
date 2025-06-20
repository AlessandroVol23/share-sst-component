import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Prettify, Transform } from "../component";
import { Link } from "../link";
import { Input } from "../input";
import { Dns } from "../dns";
import { sesv2 } from "@pulumi/aws";
interface Events {
    /**
     * The name of the event.
     */
    name: Input<string>;
    /**
     * The types of events to send.
     */
    types: Input<Input<"send" | "reject" | "bounce" | "complaint" | "delivery" | "delivery-delay" | "rendering-failure" | "subscription" | "open" | "click">[]>;
    /**
     * The ARN of the SNS topic to send events to.
     */
    topic?: Input<string>;
    /**
     * The ARN of the EventBridge bus to send events to.
     */
    bus?: Input<string>;
}
export interface EmailArgs {
    /**
     * The email address or domain name that you want to send emails from.
     *
     * :::note
     * You'll need to verify the email address or domain you are using.
     * :::
     *
     * @example
     *
     * Using an email address as the sender. You'll need to verify the email address.
     * When you deploy your app, you will receive an email from AWS SES with a link to verify the
     * email address.
     *
     * ```ts
     * {
     *   sender: "john.smith@gmail.com"
     * }
     * ```
     *
     * Using a domain name as the sender. You'll need to verify that you own the domain.
     * Once you verified, you can send emails from any email addresses in the domain.
     *
     * :::tip
     * SST can automatically verify the domain for the `dns` adapter that's specified.
     * :::
     *
     * To verify the domain, you need to add the verification records to your domain's DNS.
     * This can be done automatically for the supported `dns` adapters.
     *
     * ```ts
     * {
     *   sender: "example.com"
     * }
     * ```
     *
     * If the domain is hosted on Cloudflare.
     *
     * ```ts
     * {
     *   sender: "example.com",
     *   dns: sst.cloudflare.dns()
     * }
     * ```
     */
    sender: Input<string>;
    /**
     * The DNS adapter you want to use for managing DNS records. Only specify this if you
     * are using a domain name as the `sender`.
     *
     * :::note
     * If `dns` is set to `false`, you have to add the DNS records manually to verify
     * the domain.
     * :::
     *
     * @default `sst.aws.dns`
     *
     * @example
     *
     * Specify the hosted zone ID for the domain.
     *
     * ```js
     * {
     *   dns: sst.aws.dns({
     *     zone: "Z2FDTNDATAQYW2"
     *   })
     * }
     * ```
     *
     * Domain is hosted on Cloudflare.
     *
     * ```js
     * {
     *   dns: sst.cloudflare.dns()
     * }
     * ```
     */
    dns?: Input<false | (Dns & {})>;
    /**
     * The DMARC policy for the domain. This'll create a DNS record with the given DMARC policy.
     * Only specify this if you are using a domain name as the `sender`.
     *
     * @default `"v=DMARC1; p=none;"`
     *
     * @example
     * ```js
     * {
     *   dmarc: "v=DMARC1; p=quarantine; adkim=s; aspf=s;"
     * }
     * ```
     */
    dmarc?: Input<string>;
    /**
     * Configure event notifications for this Email component.
     *
     * @default No event notifications
     * @example
     *
     * ```js
     * {
     *   events: {
     *     name: "OnBounce",
     *     types: ["bounce"],
     *     topic: "arn:aws:sns:us-east-1:123456789012:MyTopic"
     *   }
     * }
     * ```
     */
    events?: Input<Prettify<Events>[]>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the SES identity resource.
         */
        identity?: Transform<sesv2.EmailIdentityArgs>;
        /**
         * Transform the SES configuration set resource.
         */
        configurationSet?: Transform<sesv2.ConfigurationSetArgs>;
    };
}
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
export declare class Email extends Component implements Link.Linkable {
    private _sender;
    private identity;
    private configurationSet;
    constructor(name: string, args: EmailArgs, opts?: ComponentResourceOptions);
    /**
     * The sender email address or domain name.
     */
    get sender(): Output<string>;
    /**
     * The name of the configuration set.
     */
    get configSet(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon SES identity.
         */
        identity: import("@pulumi/aws/sesv2/emailIdentity").EmailIdentity;
        /**
         * The Amazon SES configuration set.
         */
        configurationSet: import("@pulumi/aws/sesv2/configurationSet").ConfigurationSet;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            sender: Output<string>;
            configSet: Output<string>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
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
    static get(name: string, sender: Input<string>, opts?: ComponentResourceOptions): Email;
}
export {};
