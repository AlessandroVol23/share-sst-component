import { ComponentResourceOptions } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { FunctionArgs } from "./function.js";
import { Input } from "../input";
import { Link } from "../link";
import { cognito, iam } from "@pulumi/aws";
export interface CognitoIdentityPoolArgs {
    /**
     * Configure Cognito User Pools as identity providers to your identity pool.
     * @example
     * ```ts
     * {
     *   userPools: [
     *     {
     *       userPool: "us-east-1_QY6Ly46JH",
     *       client: "6va5jg3cgtrd170sgokikjm5m6"
     *     }
     *   ]
     * }
     * ```
     */
    userPools?: Input<Input<{
        /**
         * The Cognito user pool ID.
         */
        userPool: Input<string>;
        /**
         * The Cognito User Pool client ID.
         */
        client: Input<string>;
    }>[]>;
    /**
     * The permissions to attach to the authenticated and unauthenticated roles.
     * This allows the authenticated and unauthenticated users to access other AWS resources.
     *
     * @example
     * ```js
     * {
     *   permissions: {
     *     authenticated: [
     *       {
     *         actions: ["s3:GetObject", "s3:PutObject"],
     *         resources: ["arn:aws:s3:::my-bucket/*"]
     *       }
     *     ],
     *     unauthenticated: [
     *       {
     *         actions: ["s3:GetObject"],
     *         resources: ["arn:aws:s3:::my-bucket/*"]
     *       }
     *     ]
     *   }
     * }
     * ```
     */
    permissions?: Input<{
        /**
         * Attaches the given list of permissions to the authenticated users.
         */
        authenticated?: FunctionArgs["permissions"];
        /**
         * Attaches the given list of permissions to the unauthenticated users.
         */
        unauthenticated?: FunctionArgs["permissions"];
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Cognito identity pool resource.
         */
        identityPool?: Transform<cognito.IdentityPoolArgs>;
        /**
         * Transform the authenticated IAM role resource.
         */
        authenticatedRole?: Transform<iam.RoleArgs>;
        /**
         * Transform the unauthenticated IAM role resource.
         */
        unauthenticatedRole?: Transform<iam.RoleArgs>;
    };
}
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
export declare class CognitoIdentityPool extends Component implements Link.Linkable {
    private identityPool;
    private authRole;
    private unauthRole;
    constructor(name: string, args?: CognitoIdentityPoolArgs, opts?: ComponentResourceOptions);
    /**
     * The Cognito identity pool ID.
     */
    get id(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon Cognito identity pool.
         */
        identityPool: import("@pulumi/aws/cognito/identityPool").IdentityPool;
        /**
         * The authenticated IAM role.
         */
        authenticatedRole: import("@pulumi/aws/iam/role").Role;
        /**
         * The unauthenticated IAM role.
         */
        unauthenticatedRole: import("@pulumi/aws/iam/role").Role;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            id: import("@pulumi/pulumi").Output<string>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
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
    static get(name: string, identityPoolID: Input<string>, opts?: ComponentResourceOptions): CognitoIdentityPool;
}
