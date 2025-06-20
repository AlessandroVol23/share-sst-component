import { interpolate, output } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { cognito, getRegionOutput, iam } from "@pulumi/aws";
import { permission } from "./permission";
import { parseRoleArn } from "./helpers/arn";
/**
 * The `CognitoIdentityPool` component lets you add a [Amazon Cognito identity pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html) to your app.
 *
 * #### Create the identity pool
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.CognitoIdentityPool("MyIdentityPool", {
 *   userPools: [
 *     {
 *       userPool: "us-east-1_QY6Ly46JH",
 *       client: "6va5jg3cgtrd170sgokikjm5m6"
 *     }
 *   ]
 * });
 * ```
 *
 * #### Configure permissions for authenticated users
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.CognitoIdentityPool("MyIdentityPool", {
 *   userPools: [
 *     {
 *       userPool: "us-east-1_QY6Ly46JH",
 *       client: "6va5jg3cgtrd170sgokikjm5m6"
 *     }
 *   ],
 *   permissions: {
 *     authenticated: [
 *       {
 *         actions: ["s3:GetObject", "s3:PutObject"],
 *         resources: ["arn:aws:s3:::my-bucket/*"]
 *       }
 *     ]
 *   }
 * });
 * ```
 */
export class CognitoIdentityPool extends Component {
    constructor(name, args = {}, opts) {
        super(__pulumiType, name, args, opts);
        if (args && "ref" in args) {
            const ref = args;
            this.identityPool = ref.identityPool;
            this.authRole = ref.authRole;
            this.unauthRole = ref.unauthRole;
            return;
        }
        const parent = this;
        const region = getRegion();
        const identityPool = createIdentityPool();
        const authRole = createAuthRole();
        const unauthRole = createUnauthRole();
        createRoleAttachment();
        this.identityPool = identityPool;
        this.authRole = authRole;
        this.unauthRole = unauthRole;
        function getRegion() {
            return getRegionOutput(undefined, { parent }).name;
        }
        function createIdentityPool() {
            return new cognito.IdentityPool(...transform(args.transform?.identityPool, `${name}IdentityPool`, {
                identityPoolName: "",
                allowUnauthenticatedIdentities: true,
                cognitoIdentityProviders: args.userPools &&
                    output(args.userPools).apply((userPools) => userPools.map((v) => ({
                        clientId: v.client,
                        providerName: interpolate `cognito-idp.${region}.amazonaws.com/${v.userPool}`,
                    }))),
                supportedLoginProviders: {},
            }, { parent }));
        }
        function createAuthRole() {
            const policy = output(args.permissions).apply((permissions) => iam.getPolicyDocumentOutput({
                statements: [
                    {
                        effect: "Allow",
                        actions: [
                            "mobileanalytics:PutEvents",
                            "cognito-sync:*",
                            "cognito-identity:*",
                        ],
                        resources: ["*"],
                    },
                    ...(permissions?.authenticated || []),
                ],
            }));
            return new iam.Role(...transform(args.transform?.authenticatedRole, `${name}AuthRole`, {
                assumeRolePolicy: iam.getPolicyDocumentOutput({
                    statements: [
                        {
                            effect: "Allow",
                            principals: [
                                {
                                    type: "Federated",
                                    identifiers: ["cognito-identity.amazonaws.com"],
                                },
                            ],
                            actions: ["sts:AssumeRoleWithWebIdentity"],
                            conditions: [
                                {
                                    test: "StringEquals",
                                    variable: "cognito-identity.amazonaws.com:aud",
                                    values: [identityPool.id],
                                },
                                {
                                    test: "ForAnyValue:StringLike",
                                    variable: "cognito-identity.amazonaws.com:amr",
                                    values: ["authenticated"],
                                },
                            ],
                        },
                    ],
                }).json,
                inlinePolicies: [{ name: "inline", policy: policy.json }],
            }, { parent }));
        }
        function createUnauthRole() {
            const policy = output(args.permissions).apply((permissions) => iam.getPolicyDocumentOutput({
                statements: [
                    {
                        effect: "Allow",
                        actions: ["mobileanalytics:PutEvents", "cognito-sync:*"],
                        resources: ["*"],
                    },
                    ...(permissions?.unauthenticated || []),
                ],
            }));
            return new iam.Role(...transform(args.transform?.unauthenticatedRole, `${name}UnauthRole`, {
                assumeRolePolicy: iam.getPolicyDocumentOutput({
                    statements: [
                        {
                            effect: "Allow",
                            principals: [
                                {
                                    type: "Federated",
                                    identifiers: ["cognito-identity.amazonaws.com"],
                                },
                            ],
                            actions: ["sts:AssumeRoleWithWebIdentity"],
                            conditions: [
                                {
                                    test: "StringEquals",
                                    variable: "cognito-identity.amazonaws.com:aud",
                                    values: [identityPool.id],
                                },
                                {
                                    test: "ForAnyValue:StringLike",
                                    variable: "cognito-identity.amazonaws.com:amr",
                                    values: ["unauthenticated"],
                                },
                            ],
                        },
                    ],
                }).json,
                inlinePolicies: [{ name: "inline", policy: policy.json }],
            }, { parent }));
        }
        function createRoleAttachment() {
            return new cognito.IdentityPoolRoleAttachment(`${name}RoleAttachment`, {
                identityPoolId: identityPool.id,
                roles: {
                    authenticated: authRole.arn,
                    unauthenticated: unauthRole.arn,
                },
            }, { parent });
        }
    }
    /**
     * The Cognito identity pool ID.
     */
    get id() {
        return this.identityPool.id;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon Cognito identity pool.
             */
            identityPool: this.identityPool,
            /**
             * The authenticated IAM role.
             */
            authenticatedRole: this.authRole,
            /**
             * The unauthenticated IAM role.
             */
            unauthenticatedRole: this.unauthRole,
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                id: this.id,
            },
            include: [
                permission({
                    actions: ["cognito-identity:*"],
                    resources: [this.identityPool.arn],
                }),
            ],
        };
    }
    /**
     * Reference an existing Identity Pool with the given ID. This is useful when you
     * create a Identity Pool in one stage and want to share it in another. It avoids having to
     * create a new Identity Pool in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share Identity Pools across stages.
     * :::
     *
     * @param name The name of the component.
     * @param identityPoolID The ID of the existing Identity Pool.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a Identity Pool in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new pool, you want to share the same pool from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const identityPool = $app.stage === "frank"
     *   ? sst.aws.CognitoIdentityPool.get("MyIdentityPool", "us-east-1:02facf30-e2f3-49ec-9e79-c55187415cf8")
     *   : new sst.aws.CognitoIdentityPool("MyIdentityPool");
     * ```
     *
     * Here `us-east-1:02facf30-e2f3-49ec-9e79-c55187415cf8` is the ID of the Identity Pool created in the `dev` stage.
     * You can find this by outputting the Identity Pool ID in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   identityPool: identityPool.id
     * };
     * ```
     */
    static get(name, identityPoolID, opts) {
        const identityPool = cognito.IdentityPool.get(`${name}IdentityPool`, identityPoolID, undefined, opts);
        const attachment = cognito.IdentityPoolRoleAttachment.get(`${name}RoleAttachment`, identityPoolID, undefined, opts);
        const authRole = iam.Role.get(`${name}AuthRole`, attachment.roles.authenticated.apply((arn) => parseRoleArn(arn).roleName), undefined, opts);
        const unauthRole = iam.Role.get(`${name}UnauthRole`, attachment.roles.unauthenticated.apply((arn) => parseRoleArn(arn).roleName), undefined, opts);
        return new CognitoIdentityPool(name, {
            ref: true,
            identityPool,
            authRole,
            unauthRole,
        });
    }
}
const __pulumiType = "sst:aws:CognitoIdentityPool";
// @ts-expect-error
CognitoIdentityPool.__pulumiType = __pulumiType;
