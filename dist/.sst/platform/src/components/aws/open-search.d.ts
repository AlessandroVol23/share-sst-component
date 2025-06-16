import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { Link } from "../link";
import { Input } from "../input.js";
import { iam, opensearch } from "@pulumi/aws";
import { SizeGbTb } from "../size";
export interface OpenSearchArgs {
    /**
     * The OpenSearch engine version. Check out the [available versions](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html#choosing-version).
     * @default `"OpenSearch_2.17"`
     * @example
     * ```js
     * {
     *   version: "OpenSearch_2.5"
     * }
     * ```
     */
    version?: Input<string>;
    /**
     * The username of the master user.
     *
     * :::caution
     * Changing the username will cause the domain to be destroyed and recreated.
     * :::
     *
     * @default `"admin"`
     * @example
     * ```js
     * {
     *   username: "admin"
     * }
     * ```
     */
    username?: Input<string>;
    /**
     * The password of the master user.
     * @default A random password is generated.
     * @example
     * ```js
     * {
     *   password: "^Passw0rd^"
     * }
     * ```
     *
     * Use [Secrets](/docs/component/secret) to manage the password.
     * ```js
     * {
     *   password: new sst.Secret("MyDomainPassword").value
     * }
     * ```
     */
    password?: Input<string>;
    /**
     * The type of instance to use for the domain. Check out the [supported instance types](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html).
     *
     * @default `"t3.small"`
     * @example
     * ```js
     * {
     *   instance: "m6g.large"
     * }
     * ```
     */
    instance?: Input<string>;
    /**
     * The storage limit for the domain.
     *
     * @default `"10 GB"`
     * @example
     * ```js
     * {
     *   storage: "100 GB"
     * }
     * ```
     */
    storage?: Input<SizeGbTb>;
    /**
     * Configure how this component works in `sst dev`.
     *
     * By default, your OpenSearch domain is deployed in `sst dev`. But if you want to
     * instead connect to a locally running OpenSearch, you can configure the `dev` prop.
     *
     * :::note
     * By default, this creates a new OpenSearch domain even in `sst dev`.
     * :::
     *
     * This will skip deploying an OpenSearch domain and link to the locally running
     * OpenSearch process instead.
     *
     * @example
     *
     * Setting the `dev` prop also means that any linked resources will connect to the right
     * instance both in `sst dev` and `sst deploy`.
     *
     * ```ts
     * {
     *   dev: {
     *     username: "admin",
     *     password: "Passw0rd!",
     *     url: "http://localhost:9200"
     *   }
     * }
     * ```
     */
    dev?: {
        /**
         * The URL of the local OpenSearch to connect to when running in dev.
         * @default `"http://localhost:9200"`
         */
        url?: Input<string>;
        /**
         * The username of the local OpenSearch to connect to when running in dev.
         * @default Inherit from the top-level [`username`](#username).
         */
        username?: Input<string>;
        /**
         * The password of the local OpenSearch to connect to when running in dev.
         * @default Inherit from the top-level [`password`](#password).
         */
        password?: Input<string>;
    };
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the OpenSearch domain.
         */
        domain?: Transform<opensearch.DomainArgs>;
        /**
         * Transform the OpenSearch domain policy.
         */
        policy?: Transform<iam.PolicyDocument>;
    };
}
/**
 * The `OpenSearch` component lets you add a deployed instance of OpenSearch, or an
 * OpenSearch _domain_ to your app using [Amazon OpenSearch Service](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html).
 *
 * @example
 *
 * #### Create the instance
 *
 * ```js title="sst.config.ts"
 * const search = new sst.aws.OpenSearch("MySearch");
 * ```
 *
 * #### Link to a resource
 *
 * You can link your instance to other resources, like a function or your Next.js app.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [search]
 * });
 * ```
 *
 * Once linked, you can connect to it from your function code.
 *
 * ```ts title="app/page.tsx" {1,5-9}
 * import { Resource } from "sst";
 * import { Client } from "@opensearch-project/opensearch";
 *
 * const client = new Client({
 *   node: Resource.MySearch.url,
 *   auth: {
 *     username: Resource.MySearch.username,
 *     password: Resource.MySearch.password
 *   }
 * });
 *
 * // Add a document
 * await client.index({
 *   index: "my-index",
 *   body: { message: "Hello world!" }
 * });
 *
 * // Search for documents
 * const result = await client.search({
 *   index: "my-index",
 *   body: { query: { match: { message: "world" } } }
 * });
 * ```
 *
 * #### Running locally
 *
 * By default, your OpenSearch domain is deployed in `sst dev`. But let's say you are
 * running OpenSearch locally.
 *
 * ```bash
 * docker run \
 *   --rm \
 *   -p 9200:9200 \
 *   -v $(pwd)/.sst/storage/opensearch:/usr/share/opensearch/data \
 *   -e discovery.type=single-node \
 *   -e plugins.security.disabled=true \
 *   -e OPENSEARCH_INITIAL_ADMIN_PASSWORD=^Passw0rd^ \
 *   opensearchproject/opensearch:2.17.0
 * ```
 *
 * You can connect to it in `sst dev` by configuring the `dev` prop.
 *
 * ```ts title="sst.config.ts" {3-5}
 * const opensearch = new sst.aws.OpenSearch("MyOpenSearch", {
 *   dev: {
 *     url: "http://localhost:9200",
 *     username: "admin",
 *     password: "^Passw0rd^"
 *   }
 * });
 * ```
 *
 * This will skip deploying an OpenSearch domain and link to the locally running
 * OpenSearch process instead.
 *
 * ---
 *
 * ### Cost
 *
 * By default this component uses a _Single-AZ Deployment_, _On-Demand Instances_ of a
 * `t3.small.search` at $0.036 per hour. And 10GB of _General Purpose gp3 Storage_
 * at $0.122 per GB per month.
 *
 * That works out to $0.036 x 24 x 30 + $0.122 x 10 or **$27 per month**. Adjust this for
 * the `instance` type and the `storage` you are using.
 *
 * The above are rough estimates for _us-east-1_, check out the [OpenSearch Service pricing](https://aws.amazon.com/opensearch-service/pricing/)
 * for more details.
 */
export declare class OpenSearch extends Component implements Link.Linkable {
    private domain?;
    private _username?;
    private _password?;
    private dev?;
    constructor(name: string, args?: OpenSearchArgs, opts?: ComponentResourceOptions);
    /**
     * The ID of the OpenSearch component.
     */
    get id(): Output<string>;
    /** The username of the master user. */
    get username(): Output<string>;
    /** The password of the master user. */
    get password(): Output<string>;
    /**
     * The endpoint of the domain.
     */
    get url(): Output<string>;
    get nodes(): {
        domain: import("@pulumi/aws/opensearch/domain").Domain | undefined;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            username: Output<string>;
            password: Output<string>;
            url: Output<string>;
        };
    };
    /**
     * Reference an existing OpenSearch domain with the given name. This is useful when you
     * create a domain in one stage and want to share it in another. It avoids
     * having to create a new domain in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share OpenSearch domains across stages.
     * :::
     *
     * @param name The name of the component.
     * @param id The ID of the existing OpenSearch component.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a domain in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new domain, you want to share the same domain from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const search = $app.stage === "frank"
     *   ? sst.aws.OpenSearch.get("MyOpenSearch", "arn:aws:es:us-east-1:123456789012:domain/app-dev-myopensearch-efsmkrbt")
     *   : new sst.aws.OpenSearch("MyOpenSearch");
     * ```
     *
     * Here `arn:aws:es:us-east-1:123456789012:domain/app-dev-myopensearch-efsmkrbt` is the
     * ID of the OpenSearch component created in the `dev` stage.
     * You can find this by outputting the ID in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   id: search.id
     * };
     * ```
     */
    static get(name: string, id: Input<string>, opts?: ComponentResourceOptions): OpenSearch;
}
