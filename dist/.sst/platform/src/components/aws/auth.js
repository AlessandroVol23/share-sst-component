import { jsonStringify, } from "@pulumi/pulumi";
import { Component } from "../component";
import { Dynamo, Router } from ".";
import { functionBuilder } from "./helpers/function-builder";
import { env } from "../linkable";
import { Auth as AuthV1 } from "./auth-v1";
/**
 * The `Auth` component lets you create centralized auth servers on AWS. It deploys
 * [OpenAuth](https://openauth.js.org) to [AWS Lambda](https://aws.amazon.com/lambda/)
 * and uses [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) for storage.
 *
 * :::note
 * `Auth` and OpenAuth are currently in beta.
 * :::
 *
 * @example
 *
 * #### Create an OpenAuth server
 *
 * ```ts title="sst.config.ts"
 * const auth = new sst.aws.Auth("MyAuth", {
 *   issuer: "src/auth.handler"
 * });
 * ```
 *
 * Where the `issuer` function might look like this.
 *
 * ```ts title="src/auth.ts"
 * import { handle } from "hono/aws-lambda";
 * import { issuer } from "@openauthjs/openauth";
 * import { CodeProvider } from "@openauthjs/openauth/provider/code";
 * import { subjects } from "./subjects";
 *
 * const app = issuer({
 *   subjects,
 *   providers: {
 *     code: CodeProvider()
 *   },
 *   success: async (ctx, value) => {}
 * });
 *
 * export const handler = handle(app);
 * ```
 *
 * This `Auth` component will always use the
 * [`DynamoStorage`](https://openauth.js.org/docs/storage/dynamo/) storage provider.
 *
 * Learn more on the [OpenAuth docs](https://openauth.js.org/docs/issuer/) on how to configure
 * the `issuer` function.
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your auth server.
 *
 * ```js {3} title="sst.config.ts"
 * new sst.aws.Auth("MyAuth", {
 *   issuer: "src/auth.handler",
 *   domain: "auth.example.com"
 * });
 * ```
 *
 * #### Link to a resource
 *
 * You can link the auth server to other resources, like a function or your Next.js app,
 * that needs authentication.
 *
 * ```ts title="sst.config.ts" {2}
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [auth]
 * });
 * ```
 *
 * Once linked, you can now use it to create an [OpenAuth
 * client](https://openauth.js.org/docs/client/).
 *
 * ```ts title="app/page.tsx" {1,6}
 * import { Resource } from "sst"
 * import { createClient } from "@openauthjs/openauth/client"
 *
 * export const client = createClient({
 *   clientID: "nextjs",
 *   issuer: Resource.MyAuth.url
 * });
 * ```
 */
export class Auth extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const _version = 2;
        const self = this;
        self.registerVersion({
            new: _version,
            old: $cli.state.version[name],
            message: [
                `There is a new version of "Auth" that has breaking changes.`,
                ``,
                `What changed:`,
                `  - The latest version is now powered by OpenAuth - https://openauth.js.org`,
                ``,
                `To upgrade:`,
                `  - Set \`forceUpgrade: "v${_version}"\` on the "Auth" component. Learn more https://sst.dev/docs/component/aws/auth#forceupgrade`,
                ``,
                `To continue using v${$cli.state.version[name]}:`,
                `  - Rename "Auth" to "Auth.v${$cli.state.version[name]}". Learn more about versioning - https://sst.dev/docs/components/#versioning`,
            ].join("\n"),
            forceUpgrade: args.forceUpgrade,
        });
        const table = createTable();
        const issuer = createIssuer();
        const router = createRouter();
        this._table = table;
        this._issuer = issuer;
        this._router = router;
        registerOutputs();
        function registerOutputs() {
            self.registerOutputs({
                _hint: self.url,
            });
        }
        function createTable() {
            return new Dynamo(`${name}Storage`, {
                fields: { pk: "string", sk: "string" },
                primaryIndex: { hashKey: "pk", rangeKey: "sk" },
                ttl: "expiry",
            }, { parent: self });
        }
        function createIssuer() {
            const fn = args.authorizer || args.issuer;
            if (!fn)
                throw new Error("Auth: issuer field must be set");
            return functionBuilder(`${name}Issuer`, fn, {
                link: [table],
                environment: {
                    OPENAUTH_STORAGE: jsonStringify({
                        type: "dynamo",
                        options: { table: table.name },
                    }),
                },
                _skipHint: true,
            }, (args) => {
                args.url = {
                    cors: false,
                };
            }, { parent: self }).apply((v) => v.getFunction());
        }
        function createRouter() {
            if (!args.domain)
                return;
            const router = new Router(`${name}Router`, {
                domain: args.domain,
                _skipHint: true,
            }, { parent: self });
            router.route("/", issuer.url);
            return router;
        }
    }
    /**
     * The URL of the Auth component.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated function URL for the issuer.
     */
    get url() {
        return this._router?.url ?? this._issuer.url.apply((v) => v.slice(0, -1));
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The DynamoDB component.
             */
            table: this._table,
            /**
             * The Function component for the issuer.
             */
            issuer: this._issuer,
            /**
             * @deprecated Use `issuer` instead.
             * The Function component for the issuer.
             */
            authorizer: this._issuer,
            /**
             * The Router component for the custom domain.
             */
            router: this._router,
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                url: this.url,
            },
            include: [
                env({
                    OPENAUTH_ISSUER: this.url,
                }),
            ],
        };
    }
}
Auth.v1 = AuthV1;
const __pulumiType = "sst:aws:Auth";
// @ts-expect-error
Auth.__pulumiType = __pulumiType;
