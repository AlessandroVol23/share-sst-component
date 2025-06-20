import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Prettify, Transform } from "../component";
import { Input } from "../input";
import { Link } from "../link";
import { CognitoIdentityProvider } from "./cognito-identity-provider";
import { CognitoUserPoolClient } from "./cognito-user-pool-client";
import { FunctionArgs, FunctionArn } from "./function.js";
import { cognito } from "@pulumi/aws";
interface Triggers {
    /**
     * The ARN of the AWS KMS key used for encryption.
     *
     * When `customEmailSender` or `customSmsSender` are configured, Cognito encrypts the
     * verification code and temporary passwords before sending them to your Lambda functions.
     */
    kmsKey?: Input<string>;
    /**
     * Triggered after the user successfully responds to the previous challenge, and a new
     * challenge needs to be created.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    createAuthChallenge?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * Triggered during events like user sign-up, password recovery, email/phone number
     * verification, and when an admin creates a user. Use this trigger to customize the
     * email provider.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    customEmailSender?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * Triggered during events like user sign-up, password recovery, email/phone number
     * verification, and when an admin creates a user. Use this trigger to customize the
     * message that is sent to your users.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    customMessage?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * Triggered when an SMS message needs to be sent, such as for MFA or verification codes.
     * Use this trigger to customize the SMS provider.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    customSmsSender?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * Triggered after each challenge response to determine the next action. Evaluates whether the
     * user has completed the authentication process or if additional challenges are needed.
     * ARN of the lambda function to name a custom challenge.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    defineAuthChallenge?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * Triggered after a successful authentication event. Use this to perform custom actions,
     * such as logging or modifying user attributes, after the user is authenticated.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    postAuthentication?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * Triggered after a user is successfully confirmed; sign-up or email/phone number
     * verification. Use this to perform additional actions, like sending a welcome email or
     * initializing user data, after user confirmation.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    postConfirmation?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * Triggered before the authentication process begins. Use this to implement custom
     * validation or checks (like checking if the user is banned) before continuing
     * authentication.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    preAuthentication?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * Triggered before the user sign-up process completes. Use this to perform custom
     * validation, auto-confirm users, or auto-verify attributes based on custom logic.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    preSignUp?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * Triggered before tokens are generated in the authentication process. Use this to
     * customize or add claims to the tokens that will be generated and returned to the user.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    preTokenGeneration?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * The version of the preTokenGeneration trigger to use. Higher versions have access to
     * more information that support new features.
     * @default `"v1"`
     */
    preTokenGenerationVersion?: "v1" | "v2";
    /**
     * Triggered when a user attempts to sign in but does not exist in the current user pool.
     * Use this to import and validate users from an existing user directory into the
     * Cognito User Pool during sign-in.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    userMigration?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * Triggered after the user responds to a custom authentication challenge. Use this to
     * verify the user's response to the challenge and determine whether to continue
     * authenticating the user.
     *
     * Takes the handler path, the function args, or a function ARN.
     */
    verifyAuthChallengeResponse?: Input<string | FunctionArgs | FunctionArn>;
}
export interface CognitoUserPoolArgs {
    /**
     * Configure the different ways a user can sign in besides using their username.
     *
     * :::note
     * You cannot change the aliases property once the User Pool has been created.
     * Learn more about [aliases](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases).
     * :::
     *
     * @default User can only sign in with their username.
     * @example
     *
     * ```ts
     * {
     *   aliases: ["email"]
     * }
     * ```
     */
    aliases?: Input<Input<"email" | "phone" | "preferred_username">[]>;
    /**
     * Allow users to be able to sign up and sign in with an email addresses or phone number
     * as their username.
     *
     * :::note
     * You cannot change the usernames property once the User Pool has been created.
     * Learn more about [aliases](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases).
     * :::
     *
     * @default User can only sign in with their username.
     * @example
     *
     * ```ts
     * {
     *   usernames: ["email"]
     * }
     * ```
     */
    usernames?: Input<Input<"email" | "phone">[]>;
    /**
     * Enable advanced security features.
     *
     * Learn more about [advanced security](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-advanced-security.html).
     *
     * @default Advanced security is disabled.
     * @example
     *
     * ```ts
     * {
     *   advancedSecurity: "enforced"
     * }
     * ```
     */
    advancedSecurity?: Input<"audit" | "enforced">;
    /**
     * Configure the multi-factor authentication (MFA) settings for the User Pool.
     *
     * If you enable MFA using `on` or `optional`, you need to configure either `sms` or
     * `softwareToken` as well.
     *
     * @default MFA is disabled.
     * @example
     *
     * ```ts
     * {
     *   mfa: "on"
     * }
     * ```
     */
    mfa?: Input<"on" | "optional">;
    /**
     * Configure the SMS settings for the User Pool.
     *
     * @default No SMS settings.
     * @example
     *
     * ```ts
     * {
     *   sms: {
     *     externalId: "1234567890",
     *     snsCallerArn: "arn:aws:iam::1234567890:role/CognitoSnsCaller",
     *     snsRegion: "us-east-1",
     *   }
     * }
     * ```
     */
    sms?: Input<{
        /**
         * The external ID used in IAM role trust relationships.
         *
         * Learn more about [external IDs](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html).
         */
        externalId: Input<string>;
        /**
         * The ARN of the IAM role that Amazon Cognito can assume to access the Amazon SNS
         *
         */
        snsCallerArn: Input<string>;
        /**
         * The AWS Region that Amazon Cognito uses to send SMS messages.
         */
        snsRegion?: Input<string>;
    }>;
    /**
     * The message template for SMS messages sent to users who are being authenticated.
     *
     * The template must include the `{####}` placeholder, which will be replaced with the
     * verification code.
     *
     * @default The default message template.
     * @example
     *
     * ```ts
     * {
     *   smsAuthenticationMessage: "Your authentication code is {####}"
     * }
     * ```
     */
    smsAuthenticationMessage?: Input<string>;
    /**
     * Configure the verification message sent to users who are being authenticated.
     */
    verify?: Input<{
        /**
         * Subject line for Email messages sent to users who are being authenticated.
         *
         * @default `"Verify your new account"`
         * @example
         *
         * ```ts
         * {
         *   verify: {
         *     emailSubject: "Verify your new Awesome account"
         *   }
         * }
         * ```
         */
        emailSubject?: Input<string>;
        /**
         * The template for email messages sent to users who are being authenticated.
         *
         * The template must include the `{####}` placeholder, which will be replaced with the
         * verification code.
         *
         * @default `"The verification code to your new account is {####}"`
         * @example
         *
         * ```ts
         * {
         *   verify: {
         *     emailMessage: "The verification code to your new Awesome account is {####}"
         *   }
         * }
         * ```
         */
        emailMessage?: Input<string>;
        /**
         * The template for SMS messages sent to users who are being authenticated.
         *
         * The template must include the `{####}` placeholder, which will be replaced with the
         * verification code.
         *
         * @default `"The verification code to your new account is {####}"`
         * @example
         *
         * ```ts
         * {
         *   verify: {
         *     smsMessage: "The verification code to your new Awesome account is {####}"
         *   }
         * }
         * ```
         */
        smsMessage?: Input<string>;
    }>;
    /**
     * Enable software token MFA for the User Pool.
     *
     * @default `false`
     * @example
     *
     * ```ts
     * {
     *   softwareToken: true
     * }
     * ```
     */
    softwareToken?: Input<boolean>;
    /**
     * Configure triggers for this User Pool
     * @default No triggers
     * @example
     *
     * ```js
     * {
     *   triggers: {
     *     preAuthentication: "src/preAuthentication.handler",
     *     postAuthentication: "src/postAuthentication.handler"
     *   }
     * }
     * ```
     */
    triggers?: Input<Prettify<Triggers>>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Cognito User Pool resource.
         */
        userPool?: Transform<cognito.UserPoolArgs>;
    };
}
export interface CognitoIdentityProviderArgs {
    /**
     * The type of identity provider.
     */
    type: Input<"oidc" | "saml" | "google" | "facebook" | "apple" | "amazon">;
    /**
     * Configure the identity provider details, including the scopes, URLs, and identifiers.
     *
     * ```ts
     * {
     *   authorize_scopes: "email profile",
     *   client_id: "your-client-id",
     *   client_secret: "your-client-secret"
     * }
     * ```
     */
    details: Input<Record<string, Input<string>>>;
    /**
     * Define a mapping between identity provider attributes and user pool attributes.
     *
     * ```ts
     * {
     *   email: "email",
     *   username: "sub"
     * }
     * ```
     */
    attributes?: Input<Record<string, Input<string>>>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Cognito identity provider resource.
         */
        identityProvider?: Transform<cognito.IdentityProviderArgs>;
    };
}
export interface CognitoUserPoolClientArgs {
    /**
     * A list of identity providers that are supported for this client.
     * @default `["COGNITO"]`
     * @example
     *
     * :::tip
     * Reference federated identity providers using their `providerName` property.
     * :::
     *
     * If you are using a federated identity provider.
     *
     * ```js title="sst.config.ts"
     * const provider = userPool.addIdentityProvider("MyProvider", {
     *   type: "oidc",
     *   details: {
     *     authorize_scopes: "email profile",
     *     client_id: "your-client-id",
     *     client_secret: "your-client-secret"
     *   },
     * });
     * ```
     *
     * Make sure to pass in `provider.providerName` instead of hardcoding it to `"MyProvider"`.
     *
     * ```ts title="sst.config.ts" {2}
     * userPool.addClient("Web", {
     *   providers: [provider.providerName]
     * });
     * ```
     *
     * This ensures the client is created after the provider.
     */
    providers?: Input<Input<string>[]>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Cognito User Pool client resource.
         */
        client?: Transform<cognito.UserPoolClientArgs>;
    };
}
/**
 * The `CognitoUserPool` component lets you add a [Amazon Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) to your app.
 *
 * #### Create the user pool
 *
 * ```ts title="sst.config.ts"
 * const userPool = new sst.aws.CognitoUserPool("MyUserPool");
 * ```
 *
 * #### Login using email
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.CognitoUserPool("MyUserPool", {
 *   usernames: ["email"]
 * });
 * ```
 *
 * #### Configure triggers
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.CognitoUserPool("MyUserPool", {
 *   triggers: {
 *     preAuthentication: "src/preAuthentication.handler",
 *     postAuthentication: "src/postAuthentication.handler",
 *   },
 * });
 * ```
 *
 * #### Add Google identity provider
 *
 * ```ts title="sst.config.ts"
 * const GoogleClientId = new sst.Secret("GOOGLE_CLIENT_ID");
 * const GoogleClientSecret = new sst.Secret("GOOGLE_CLIENT_SECRET");
 *
 * userPool.addIdentityProvider({
 *   type: "google",
 *   details: {
 *     authorize_scopes: "email profile",
 *     client_id: GoogleClientId.value,
 *     client_secret: GoogleClientSecret.value,
 *   },
 *   attributes: {
 *     email: "email",
 *     name: "name",
 *     username: "sub",
 *   },
 * });
 * ```
 *
 * #### Add a client
 *
 * ```ts title="sst.config.ts"
 * userPool.addClient("Web");
 * ```
 */
export declare class CognitoUserPool extends Component implements Link.Linkable {
    private constructorOpts;
    private userPool;
    constructor(name: string, args?: CognitoUserPoolArgs, opts?: ComponentResourceOptions);
    /**
     * The Cognito User Pool ID.
     */
    get id(): Output<string>;
    /**
     * The Cognito User Pool ARN.
     */
    get arn(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon Cognito User Pool.
         */
        userPool: Output<import("@pulumi/aws/cognito/userPool").UserPool>;
    };
    /**
     * Add a client to the User Pool.
     *
     * @param name Name of the client.
     * @param args Configure the client.
     * @param opts? Resource options.
     *
     * @example
     *
     * ```ts
     * userPool.addClient("Web");
     * ```
     */
    addClient(name: string, args?: CognitoUserPoolClientArgs): CognitoUserPoolClient;
    /**
     * Add a federated identity provider to the User Pool.
     *
     * @param name Name of the identity provider.
     * @param args Configure the identity provider.
     *
     * @example
     *
     * For example, add a GitHub (OIDC) identity provider.
     *
     * ```ts title="sst.config.ts"
     * const GithubClientId = new sst.Secret("GITHUB_CLIENT_ID");
     * const GithubClientSecret = new sst.Secret("GITHUB_CLIENT_SECRET");
     *
     * userPool.addIdentityProvider("GitHub", {
     *   type: "oidc",
     *   details: {
     *      authorize_scopes: "read:user user:email",
     *      client_id: GithubClientId.value,
     *      client_secret: GithubClientSecret.value,
     *      oidc_issuer: "https://github.com/",
     *   },
     *   attributes: {
     *     email: "email",
     *     username: "sub",
     *   },
     * });
     * ```
     *
     * Or add a Google identity provider.
     *
     * ```ts title="sst.config.ts"
     * const GoogleClientId = new sst.Secret("GOOGLE_CLIENT_ID");
     * const GoogleClientSecret = new sst.Secret("GOOGLE_CLIENT_SECRET");
     *
     * userPool.addIdentityProvider("Google", {
     *   type: "google",
     *   details: {
     *     authorize_scopes: "email profile",
     *     client_id: GoogleClientId.value,
     *     client_secret: GoogleClientSecret.value,
     *   },
     *   attributes: {
     *     email: "email",
     *     name: "name",
     *     username: "sub",
     *   },
     * });
     * ```
     */
    addIdentityProvider(name: string, args: CognitoIdentityProviderArgs): CognitoIdentityProvider;
    /** @internal */
    getSSTLink(): {
        properties: {
            id: Output<string>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
    /**
     * Reference an existing User Pool with the given ID. This is useful when you
     * create a User Pool in one stage and want to share it in another. It avoids having to
     * create a new User Pool in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share User Pools across stages.
     * :::
     *
     * @param name The name of the component.
     * @param userPoolID The ID of the existing User Pool.
     *
     * @example
     * Imagine you create a User Pool in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new pool, you want to share the same pool from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const userPool = $app.stage === "frank"
     *   ? sst.aws.CognitoUserPool.get("MyUserPool", "us-east-1_gcF5PjhQK")
     *   : new sst.aws.CognitoUserPool("MyUserPool");
     * ```
     *
     * Here `us-east-1_gcF5PjhQK` is the ID of the User Pool created in the `dev` stage.
     * You can find this by outputting the User Pool ID in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   userPool: userPool.id
     * };
     * ```
     */
    static get(name: string, userPoolID: Input<string>, opts?: ComponentResourceOptions): CognitoUserPool;
}
export {};
