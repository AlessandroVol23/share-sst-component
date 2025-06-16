import { all, output } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { CognitoIdentityProvider } from "./cognito-identity-provider";
import { CognitoUserPoolClient } from "./cognito-user-pool-client";
import { VisibleError } from "../error";
import { cognito, lambda } from "@pulumi/aws";
import { permission } from "./permission";
import { functionBuilder } from "./helpers/function-builder";
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
export class CognitoUserPool extends Component {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
        if (args && "ref" in args) {
            const ref = args;
            this.constructorOpts = opts;
            this.userPool = output(ref.userPool);
            return;
        }
        const parent = this;
        normalizeAliasesAndUsernames();
        const triggers = normalizeTriggers();
        const verify = normalizeVerify();
        const userPool = createUserPool();
        this.constructorOpts = opts;
        this.userPool = userPool;
        function normalizeAliasesAndUsernames() {
            all([args.aliases, args.usernames]).apply(([aliases, usernames]) => {
                if (aliases && usernames)
                    throw new VisibleError("You cannot set both aliases and usernames. Learn more about customizing sign-in attributes at https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases");
            });
        }
        function normalizeTriggers() {
            if (!args.triggers)
                return;
            return output(args.triggers).apply((triggers) => {
                if ((triggers.customEmailSender || triggers.customSmsSender) &&
                    !triggers.kmsKey)
                    throw new VisibleError("You must provide a KMS key via `kmsKey` when configuring `customEmailSender` or `customSmsSender`.");
                return {
                    ...triggers,
                    preTokenGenerationVersion: triggers.preTokenGenerationVersion === "v2" ? "V2_0" : "V1_0",
                };
            });
        }
        function normalizeVerify() {
            if (!args.verify)
                return;
            return output(args.verify).apply((verify) => {
                return {
                    defaultEmailOption: "CONFIRM_WITH_CODE",
                    emailMessage: verify.emailMessage ??
                        "The verification code to your new account is {####}",
                    emailSubject: verify.emailSubject ?? "Verify your new account",
                    smsMessage: verify.smsMessage ??
                        "The verification code to your new account is {####}",
                };
            });
        }
        function createUserPool() {
            return output(args.softwareToken).apply((softwareToken) => new cognito.UserPool(...transform(args.transform?.userPool, `${name}UserPool`, {
                aliasAttributes: args.aliases &&
                    output(args.aliases).apply((aliases) => [
                        ...(aliases.includes("email") ? ["email"] : []),
                        ...(aliases.includes("phone") ? ["phone_number"] : []),
                        ...(aliases.includes("preferred_username")
                            ? ["preferred_username"]
                            : []),
                    ]),
                usernameAttributes: args.usernames &&
                    output(args.usernames).apply((usernames) => [
                        ...(usernames.includes("email") ? ["email"] : []),
                        ...(usernames.includes("phone") ? ["phone_number"] : []),
                    ]),
                accountRecoverySetting: {
                    recoveryMechanisms: [
                        {
                            name: "verified_phone_number",
                            priority: 1,
                        },
                        {
                            name: "verified_email",
                            priority: 2,
                        },
                    ],
                },
                adminCreateUserConfig: {
                    allowAdminCreateUserOnly: false,
                },
                usernameConfiguration: {
                    caseSensitive: false,
                },
                autoVerifiedAttributes: all([
                    args.aliases || [],
                    args.usernames || [],
                ]).apply(([aliases, usernames]) => {
                    const attributes = [...aliases, ...usernames];
                    return [
                        ...(attributes.includes("email") ? ["email"] : []),
                        ...(attributes.includes("phone") ? ["phone_number"] : []),
                    ];
                }),
                emailConfiguration: {
                    emailSendingAccount: "COGNITO_DEFAULT",
                },
                verificationMessageTemplate: verify,
                userPoolAddOns: {
                    advancedSecurityMode: output(args.advancedSecurity).apply((v) => (v ?? "off").toUpperCase()),
                },
                mfaConfiguration: output(args.mfa).apply((v) => (v ?? "off").toUpperCase()),
                smsAuthenticationMessage: args.smsAuthenticationMessage,
                smsConfiguration: args.sms,
                softwareTokenMfaConfiguration: softwareToken
                    ? { enabled: true }
                    : undefined,
                lambdaConfig: triggers &&
                    triggers.apply((triggers) => {
                        return {
                            kmsKeyId: triggers.kmsKey,
                            createAuthChallenge: createTrigger("createAuthChallenge"),
                            customEmailSender: triggers.customEmailSender === undefined
                                ? undefined
                                : {
                                    lambdaArn: createTrigger("customEmailSender"),
                                    lambdaVersion: "V1_0",
                                },
                            customMessage: createTrigger("customMessage"),
                            customSmsSender: triggers.customSmsSender === undefined
                                ? undefined
                                : {
                                    lambdaArn: createTrigger("customSmsSender"),
                                    lambdaVersion: "V1_0",
                                },
                            defineAuthChallenge: createTrigger("defineAuthChallenge"),
                            postAuthentication: createTrigger("postAuthentication"),
                            postConfirmation: createTrigger("postConfirmation"),
                            preAuthentication: createTrigger("preAuthentication"),
                            preSignUp: createTrigger("preSignUp"),
                            preTokenGenerationConfig: triggers.preTokenGeneration === undefined
                                ? undefined
                                : {
                                    lambdaArn: createTrigger("preTokenGeneration"),
                                    lambdaVersion: triggers.preTokenGenerationVersion,
                                },
                            userMigration: createTrigger("userMigration"),
                            verifyAuthChallengeResponse: createTrigger("verifyAuthChallengeResponse"),
                        };
                        function createTrigger(key) {
                            if (!triggers[key])
                                return;
                            const fn = functionBuilder(`${name}Trigger${key}`, triggers[key], {
                                description: `Subscribed to ${key} from ${name}`,
                            }, undefined, { parent });
                            new lambda.Permission(`${name}Permission${key}`, {
                                action: "lambda:InvokeFunction",
                                function: fn.arn,
                                principal: "cognito-idp.amazonaws.com",
                                sourceArn: userPool.arn,
                            }, { parent });
                            return fn.arn;
                        }
                    }),
            }, { parent })));
        }
    }
    /**
     * The Cognito User Pool ID.
     */
    get id() {
        return this.userPool.id;
    }
    /**
     * The Cognito User Pool ARN.
     */
    get arn() {
        return this.userPool.arn;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon Cognito User Pool.
             */
            userPool: this.userPool,
        };
    }
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
    addClient(name, args) {
        // Note: Referencing an existing client will be implemented in the future:
        // sst.aws.UserPool.getClient("pool", { userPooldID, clientID });
        return new CognitoUserPoolClient(name, {
            userPool: this.id,
            ...args,
        }, { provider: this.constructorOpts.provider });
    }
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
    addIdentityProvider(name, args) {
        return new CognitoIdentityProvider(name, {
            userPool: this.id,
            ...args,
        }, { provider: this.constructorOpts.provider });
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                id: this.id,
            },
            include: [
                permission({
                    actions: ["cognito-idp:*"],
                    resources: [this.userPool.arn],
                }),
            ],
        };
    }
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
    static get(name, userPoolID, opts) {
        const userPool = cognito.UserPool.get(`${name}UserPool`, userPoolID, undefined, opts);
        return new CognitoUserPool(name, {
            ref: true,
            userPool,
        });
    }
}
const __pulumiType = "sst:aws:CognitoUserPool";
// @ts-expect-error
CognitoUserPool.__pulumiType = __pulumiType;
