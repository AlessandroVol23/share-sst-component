import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { Cdn, CdnArgs } from "./cdn";
import { cloudfront } from "@pulumi/aws";
import { Bucket } from "./bucket";
import { DurationSeconds } from "../duration";
interface InlineUrlRouteArgs extends InlineBaseRouteArgs {
    /**
     * The destination URL.
     *
     * @example
     *
     * ```js
     * {
     *   routes: {
     *     "/api/*": {
     *       url: "https://example.com"
     *     }
     *   }
     * }
     * ```
     */
    url: Input<string>;
    /**
     * Rewrite the request path.
     *
     * @example
     *
     * By default, if the route path is `/api/*` and a request comes in for `/api/users/profile`,
     * the request path the destination sees is `/api/users/profile`.
     *
     * If you want to serve the route from the root, you can rewrite the request path to
     * `/users/profile`.
     *
     * ```js
     * {
     *   routes: {
     *     "/api/*": {
     *       url: "https://api.example.com",
     *       rewrite: {
     *         regex: "^/api/(.*)$",
     *         to: "/$1"
     *       }
     *     }
     *   }
     * }
     * ```
     */
    rewrite?: Input<{
        /**
         * The regex to match the request path.
         */
        regex: Input<string>;
        /**
         * The replacement for the matched path.
         */
        to: Input<string>;
    }>;
}
interface InlineRouterBucketRouteArgs extends InlineBaseRouteArgs {
    /**
     * A bucket to route to.
     *
     * :::note
     * You need to let CloudFront `access` the bucket.
     * :::
     *
     * @example
     *
     * For example, let's say you have a bucket that gives CloudFront `access`.
     *
     * ```ts title="sst.config.ts" {2}
     * const myBucket = new sst.aws.Bucket("MyBucket", {
     *   access: "cloudfront"
     * });
     * ```
     *
     * You can then this directly as the destination for the route.
     *
     * ```js
     * {
     *   routes: {
     *     "/files/*": {
     *       bucket: myBucket
     *     }
     *   }
     * }
     * ```
     *
     * Or if you have an existing bucket, you can pass in its regional domain.
     *
     * ```js
     * {
     *   routes: {
     *     "/files/*": {
     *       bucket: "my-bucket.s3.us-east-1.amazonaws.com"
     *     }
     *   }
     * }
     * ```
     */
    bucket?: Input<Bucket | string>;
    /**
     * Rewrite the request path.
     *
     * @example
     *
     * By default, if the route path is `/files/*` and a request comes in for `/files/logo.png`,
     * the request path the destination sees is `/files/logo.png`. In the case of a bucket route,
     * the file `logo.png` is served from the `files` directory in the bucket.
     *
     * If you want to serve the file from the root of the bucket, you can rewrite
     * the request path to `/logo.png`.
     *
     * ```js
     * {
     *   routes: {
     *     "/files/*": {
     *       bucket: myBucket,
     *       rewrite: {
     *         regex: "^/files/(.*)$",
     *         to: "/$1"
     *       }
     *     }
     *   }
     * }
     * ```
     */
    rewrite?: Input<{
        /**
         * The regex to match the request path.
         */
        regex: Input<string>;
        /**
         * The replacement for the matched path.
         */
        to: Input<string>;
    }>;
}
interface InlineBaseRouteArgs {
    /**
     * The cache policy to use for the route.
     *
     * @default CloudFront's managed CachingOptimized policy
     * @example
     * ```js
     * {
     *   routes: {
     *     "/files/*": {
     *       url: "https://example.com"
     *       cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6"
     *     }
     *   }
     * }
     * ```
     */
    cachePolicy?: Input<string>;
    /**
     * Configure CloudFront Functions to customize the behavior of HTTP requests and responses at the edge.
     */
    edge?: {
        /**
         * Configure the viewer request function.
         *
         * The viewer request function can be used to modify incoming requests before they
         * reach your origin server. For example, you can redirect users, rewrite URLs,
         * or add headers.
         */
        viewerRequest?: Input<{
            /**
             * The code to inject into the viewer request function.
             *
             * By default, a viewer request function is created to add the `x-forwarded-host`
             * header. The given code will be injected at the end of this function.
             *
             * ```js
             * async function handler(event) {
             *   // Default behavior code
             *
             *   // User injected code
             *
             *   return event.request;
             * }
             * ```
             *
             * @example
             * To add a custom header to all requests.
             *
             * ```js
             * {
             *   routes: {
             *     "/api/*": {
             *       url: "https://example.com"
             *       edge: {
             *         viewerRequest: {
             *           injection: `event.request.headers["x-foo"] = "bar";`
             *         }
             *       }
             *     }
             *   }
             * }
             * ```
             */
            injection: Input<string>;
            /**
             * The KeyValueStore to associate with the viewer request function.
             *
             * @example
             * ```js
             * {
             *   routes: {
             *     "/api/*": {
             *       url: "https://example.com"
             *       edge: {
             *         viewerRequest: {
             *           kvStore: "arn:aws:cloudfront::123456789012:key-value-store/my-store"
             *         }
             *       }
             *     }
             *   }
             * }
             * ```
             */
            kvStore?: Input<string>;
            /**
             * @deprecated Use `kvStore` instead because CloudFront Functions only support one KeyValueStore.
             */
            kvStores?: Input<Input<string>[]>;
        }>;
        /**
         * Configure the viewer response function.
         *
         * The viewer response function can be used to modify outgoing responses before
         * they are sent to the client. For example, you can add security headers or change
         * the response status code.
         *
         * By default, no viewer response function is set. A new function will be created
         * with the provided code.
         *
         * @example
         * Add a custom header to all responses
         * ```js
         * {
         *   routes: {
         *     "/api/*": {
         *       url: "https://example.com"
         *       edge: {
         *         viewerResponse: {
         *           injection: `event.response.headers["x-foo"] = "bar";`
         *         }
         *       }
         *     }
         *   }
         * }
         * ```
         */
        viewerResponse?: Input<{
            /**
             * The code to inject into the viewer response function.
             *
             * By default, no viewer response function is set. A new function will be created with
             * the provided code.
             *
             * ```js
             * async function handler(event) {
             *   // User injected code
             *
             *   return event.response;
             * }
             * ```
             *
             * @example
             * To add a custom header to all responses.
             *
             * ```js
             * {
             *   routes: {
             *     "/api/*": {
             *       url: "https://example.com"
             *       edge: {
             *         viewerResponse: {
             *           injection: `event.response.headers["x-foo"] = "bar";`
             *         }
             *       }
             *     }
             *   }
             * }
             * ```
             */
            injection: Input<string>;
            /**
             * The KeyValueStore to associate with the viewer response function.
             *
             * @example
             * ```js
             * {
             *   routes: {
             *     "/api/*": {
             *       url: "https://example.com"
             *       edge: {
             *         viewerResponse: {
             *           kvStore: "arn:aws:cloudfront::123456789012:key-value-store/my-store"
             *         }
             *       }
             *     }
             *   }
             * }
             * ```
             */
            kvStore?: Input<string>;
            /**
             * @deprecated Use `kvStore` instead because CloudFront Functions only support one KeyValueStore.
             */
            kvStores?: Input<Input<string>[]>;
        }>;
    };
}
interface RouteArgs {
    /**
     * The number of times that CloudFront attempts to connect to the origin. Must be
     * between 1 and 3.
     * @default 3
     * @example
     * ```js
     * {
     *   connectionAttempts: 1
     * }
     * ```
     */
    connectionAttempts?: Input<number>;
    /**
     * The number of seconds that CloudFront waits before timing out and closing the
     * connection to the origin. Must be between 1 and 10 seconds.
     * @default `"10 seconds"`
     * @example
     * ```js
     * {
     *   connectionTimeout: "3 seconds"
     * }
     * ```
     */
    connectionTimeout?: Input<DurationSeconds>;
}
export interface RouterUrlRouteArgs extends RouteArgs {
    /**
     * Rewrite the request path.
     *
     * @example
     *
     * If the route path is `/api/*` and a request comes in for `/api/users/profile`,
     * the request path the destination sees is `/api/users/profile`.
     *
     * If you want to serve the route from the root, you can rewrite the request
     * path to `/users/profile`.
     *
     * ```js
     * {
     *   rewrite: {
     *     regex: "^/api/(.*)$",
     *     to: "/$1"
     *   }
     * }
     * ```
     */
    rewrite?: Input<{
        /**
         * The regex to match the request path.
         */
        regex: Input<string>;
        /**
         * The replacement for the matched path.
         */
        to: Input<string>;
    }>;
    /**
     * The number of seconds that CloudFront waits for a response after routing a
     * request to the destination. Must be between 1 and 60 seconds.
     *
     * When compared to the `connectionTimeout`, this is the total time for the
     * request.
     *
     * @default `"20 seconds"`
     * @example
     * ```js
     * {
     *   readTimeout: "60 seconds"
     * }
     * ```
     */
    readTimeout?: Input<DurationSeconds>;
    /**
     * The number of seconds that CloudFront should try to maintain the connection
     * to the destination after receiving the last packet of the response. Must be
     * between 1 and 60 seconds
     * @default `"5 seconds"`
     * @example
     * ```js
     * {
     *   keepAliveTimeout: "10 seconds"
     * }
     * ```
     */
    keepAliveTimeout?: Input<DurationSeconds>;
}
export interface RouterBucketRouteArgs extends RouteArgs {
    /**
     * Rewrite the request path.
     *
     * @example
     *
     * If the route path is `/files/*` and a request comes in for `/files/logo.png`,
     * the request path the destination sees is `/files/logo.png`.
     *
     * If you want to serve the file from the root of the bucket, you can rewrite
     * the request path to `/logo.png`.
     *
     * ```js
     * {
     *   rewrite: {
     *     regex: "^/files/(.*)$",
     *     to: "/$1"
     *   }
     * }
     * ```
     */
    rewrite?: Input<{
        /**
         * The regex to match the request path.
         */
        regex: Input<string>;
        /**
         * The replacement for the matched path.
         */
        to: Input<string>;
    }>;
}
export interface RouterArgs {
    /**
     * Set a custom domain for your Router.
     *
     * Automatically manages domains hosted on AWS Route 53, Cloudflare, and Vercel. For other
     * providers, you'll need to pass in a `cert` that validates domain ownership and add the
     * DNS records.
     *
     * :::tip
     * Built-in support for AWS Route 53, Cloudflare, and Vercel. And manual setup for other
     * providers.
     * :::
     *
     * @example
     *
     * By default this assumes the domain is hosted on Route 53.
     *
     * ```js
     * {
     *   domain: "example.com"
     * }
     * ```
     *
     * For domains hosted on Cloudflare.
     *
     * ```js
     * {
     *   domain: {
     *     name: "example.com",
     *     dns: sst.cloudflare.dns()
     *   }
     * }
     * ```
     *
     * Specify a `www.` version of the custom domain.
     *
     * ```js
     * {
     *   domain: {
     *     name: "domain.com",
     *     redirects: ["www.domain.com"]
     *   }
     * }
     * ```
     */
    domain?: CdnArgs["domain"];
    /**
     * A map of routes to their destinations.
     *
     * @deprecated Use the `route` and `routeBucket` functions instead. These
     * functions provide a more flexible API for routing to URLs and buckets. They
     * also allow routing based on both domain and path patterns.
     *
     * The _key_ is the route path and the _value_ can be:
     *
     * - The destination URL as a string
     * - Or, an object with
     *   - Args for a URL route
     *   - Args for a bucket route
     *
     * :::note
     * All routes need to start with `/`.
     * :::
     *
     * For example, you can set the destination as a URL.
     *
     * ```ts
     * {
     *   routes: {
     *     "/*": "https://example.com"
     *   }
     * }
     * ```
     *
     * Or, you can route to a bucket.
     *
     * ```ts
     * {
     *   routes: {
     *     "/files/*": {
     *       bucket: myBucket
     *     }
     *   }
     * }
     * ```
     *
     * When router receives a request, the requested path is compared with path patterns
     * in the order they are listed. The first match determines which URL the
     * request is routed to.
     *
     * :::tip[Default Route]
     * The `/*` route is a default or catch-all route.
     * :::
     *
     * The `/*` route is a _default_ route, meaning that if no routes match, the `/*` route will be used. It does not matter where the `/*` route is listed in the routes object.
     *
     * :::note
     * If you don't have a `/*` route, you'll get a 404 error for any requests that don't match a route.
     * :::
     *
     * Suppose you have the following three routes.
     *
     * ```js
     * {
     *   routes: {
     *     "/api/*.json": "https://example1.com",
     *     "/api/*": "https://example2.com",
     *     "/*.xml": "https://example3.com",
     *   }
     * }
     * ```
     *
     * A request to `/api/sample.xml` will match `/api/*` first and route to it; even though it matches `/*.xml`.
     *
     * However for this case, a request to `/api/users` will route to `/api/*` even though it comes after `/*`. This is because the `/*` route is the default route.
     *
     * ```js
     * {
     *   routes: {
     *     "/*": "myapp.com",
     *     "/api/*": myFunction.url
     *   }
     * }
     * ```
     *
     * You can also customize the route behavior with injecting some code into the CloudFront
     * Functions. To do so, pass in an object, with the destination as the `url`.
     *
     * ```ts
     * {
     *   routes: {
     *     "/*": {
     *       url: "https://example.com",
     *       edge: {
     *         viewerRequest: {
     *           injection: `event.request.headers["x-foo"] = "bar";`
     *         }
     *       }
     *     }
     *   }
     * }
     * ```
     *
     * You can also `rewrite` the request path.
     *
     * ```ts
     * {
     *   routes: {
     *     "/files/*": {
     *       bucket: myBucket,
     *       rewrite: {
     *         regex: "^/files/(.*)$",
     *         to: "/$1"
     *       }
     *     }
     *   }
     * }
     * ```
     */
    routes?: Input<Record<string, Input<string | InlineUrlRouteArgs | InlineRouterBucketRouteArgs>>>;
    /**
     * Configure CloudFront Functions to customize the behavior of HTTP requests and responses at the edge.
     */
    edge?: {
        /**
         * Configure the viewer request function.
         *
         * The viewer request function can be used to modify incoming requests before they
         * reach your origin server. For example, you can redirect users, rewrite URLs,
         * or add headers.
         */
        viewerRequest?: Input<{
            /**
             * The code to inject into the viewer request function.
             *
             * By default, a viewer request function is created to:
             * - Disable CloudFront default URL if custom domain is set.
             * - Add the `x-forwarded-host` header.
             * - Route requests to the corresponding target based on the domain and request path.
             *
             * The given code will be injected at the beginning of this function.
             *
             * ```js
             * async function handler(event) {
             *   // User injected code
             *
             *   // Default behavior code
             *
             *   return event.request;
             * }
             * ```
             *
             * @example
             * To add a custom header to all requests.
             *
             * ```js
             * {
             *   edge: {
             *     viewerRequest: {
             *       injection: `event.request.headers["x-foo"] = "bar";`
             *     }
             *   }
             * }
             * ```
             */
            injection: Input<string>;
            /**
             * The KeyValueStore to associate with the viewer request function.
             *
             * @example
             * ```js
             * {
             *   edge: {
             *     viewerRequest: {
             *       kvStore: "arn:aws:cloudfront::123456789012:key-value-store/my-store"
             *     }
             *   }
             * }
             * ```
             */
            kvStore?: Input<string>;
        }>;
        /**
         * Configure the viewer response function.
         *
         * The viewer response function can be used to modify outgoing responses before
         * they are sent to the client. For example, you can add security headers or change
         * the response status code.
         *
         * By default, no viewer response function is set. A new function will be created
         * with the provided code.
         */
        viewerResponse?: Input<{
            /**
             * The code to inject into the viewer response function.
             *
             * ```js
             * async function handler(event) {
             *   // User injected code
             *
             *   return event.response;
             * }
             * ```
             *
             * @example
             * To add a custom header to all responses.
             *
             * ```js
             * {
             *   edge: {
             *     viewerResponse: {
             *       injection: `event.response.headers["x-foo"] = "bar";`
             *     }
             *   }
             * }
             * ```
             */
            injection: Input<string>;
            /**
             * The KeyValueStore to associate with the viewer response function.
             *
             * @example
             * ```js
             * {
             *   edge: {
             *     viewerResponse: {
             *       kvStore: "arn:aws:cloudfront::123456789012:key-value-store/my-store"
             *     }
             *   }
             * }
             * ```
             */
            kvStore?: Input<string>;
        }>;
    };
    /**
     * Configure how the CloudFront cache invalidations are handled.
     * :::tip
     * You get 1000 free invalidations per month. After that you pay $0.005 per invalidation path. [Read more here](https://aws.amazon.com/cloudfront/pricing/).
     * :::
     * @default Invalidation is turned off
     * @example
     * Setting this to `true` will invalidate all paths. It's equivalent
     * to passing in `{ paths: ["/*"] }`.
     *
     * ```js
     * {
     *   invalidation: true
     * }
     * ```
     */
    invalidation?: Input<boolean | {
        /**
         * Configure if `sst deploy` should wait for the CloudFront cache invalidation to finish.
         *
         * :::tip
         * For non-prod environments it might make sense to pass in `false`.
         * :::
         *
         * Waiting for this process to finish ensures that new content will be available after the deploy finishes. However, this process can sometimes take more than 5 mins.
         * @default `false`
         * @example
         * ```js
         * {
         *   invalidation: {
         *     wait: true
         *   }
         * }
         * ```
         */
        wait?: Input<boolean>;
        /**
         * A token used to determine if the cache should be invalidated. If the
         * token is the same as the previous deployment, the cache will not be invalidated.
         *
         * You can set this to a hash that's computed on every deploy. So if the hash
         * changes, the cache will be invalidated.
         *
         * @default A unique value is auto-generated on each deploy
         * @example
         * ```js
         * {
         *   invalidation: {
         *     token: "foo123"
         *   }
         * }
         * ```
         */
        token?: Input<string>;
        /**
         * Specify an array of glob pattern of paths to invalidate.
         *
         * :::note
         * Each glob pattern counts as a single invalidation. Whereas, invalidating
         * `/*` counts as a single invalidation.
         * :::
         * @default `["/*"]`
         * @example
         * Invalidate the `index.html` and all files under the `products/` route.
         * ```js
         * {
         *   invalidation: {
         *     paths: ["/index.html", "/products/*"]
         *   }
         * }
         * ```
         * This counts as two invalidations.
         */
        paths?: Input<Input<string>[]>;
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Cache Policy that's attached to each CloudFront behavior.
         */
        cachePolicy?: Transform<cloudfront.CachePolicyArgs>;
        /**
         * Transform the CloudFront CDN resource.
         */
        cdn?: Transform<CdnArgs>;
    };
    /**
     * @internal
     */
    _skipHint?: boolean;
}
/**
 * The `Router` component lets you use a CloudFront distribution to direct
 * requests to various parts of your application like:
 *
 * - A URL
 * - A function
 * - A frontend
 * - An S3 bucket
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Router("MyRouter");
 * ```
 *
 * #### Add a custom domain
 *
 * ```ts {2} title="sst.config.ts"
 * new sst.aws.Router("MyRouter", {
 *   domain: "myapp.com"
 * });
 * ```
 *
 * #### Sharing the router across stages
 *
 * ```ts title="sst.config.ts"
 * const router = $app.stage === "production"
 *   ? new sst.aws.Router("MyRouter", {
 *       domain: {
 *         name: "example.com",
 *         aliases: ["*.example.com"]
 *       }
 *     })
 *   : sst.aws.Router.get("MyRouter", "E1XWRGCYGTFB7Z");
 * ```
 *
 * #### Route to a URL
 *
 * ```ts title="sst.config.ts" {3}
 * const router = new sst.aws.Router("MyRouter");
 *
 * router.route("/", "https://some-external-service.com");
 * ```
 *
 * #### Route to an S3 bucket
 *
 * ```ts title="sst.config.ts" {2,6}
 * const myBucket = new sst.aws.Bucket("MyBucket", {
 *   access: "cloudfront"
 * });
 *
 * const router = new sst.aws.Router("MyRouter");
 * router.routeBucket("/files", myBucket);
 * ```
 *
 * You need to allow CloudFront to access the bucket by setting the `access` prop
 * on the bucket.
 *
 * #### Route to a function
 *
 * ```ts title="sst.config.ts" {8-11}
 * const router = new sst.aws.Router("MyRouter", {
 *   domain: "example.com"
 * });
 *
 * const myFunction = new sst.aws.Function("MyFunction", {
 *   handler: "src/api.handler",
 *   url: {
 *     router: {
 *       instance: router,
 *       path: "/api"
 *     }
 *   }
 * });
 * ```
 *
 * Setting the route through the function, instead of `router.route()` makes
 * it so that `myFunction.url` gives you the URL based on the Router domain.
 *
 * #### Route to a frontend
 *
 * ```ts title="sst.config.ts" {4-6}
 * const router = new sst.aws.Router("MyRouter");
 *
 * const mySite = new sst.aws.Nextjs("MyWeb", {
 *   router: {
 *     instance: router
 *   }
 * });
 * ```
 *
 * Setting the route through the site, instead of `router.route()` makes
 * it so that `mySite.url` gives you the URL based on the Router domain.
 *
 * #### Route to a frontend on a path
 *
 * ```ts title="sst.config.ts" {4-7}
 * const router = new sst.aws.Router("MyRouter");
 *
 * new sst.aws.Nextjs("MyWeb", {
 *   router: {
 *     instance: router,
 *     path: "/docs"
 *   }
 * });
 * ```
 *
 * If you are routing to a path, you'll need to configure the base path in your
 * frontend app as well. [Learn more](/docs/component/aws/nextjs/#router).
 *
 * #### Route to a frontend on a subdomain
 *
 * ```ts title="sst.config.ts" {4,9-12}
 * const router = new sst.aws.Router("MyRouter", {
 *   domain: {
 *     name: "example.com",
 *     aliases: ["*.example.com"]
 *   }
 * });
 *
 * new sst.aws.Nextjs("MyWeb", {
 *   router: {
 *     instance: router,
 *     domain: "docs.example.com"
 *   }
 * });
 * ```
 *
 * We configure `*.example.com` as an alias so that we can route to a subdomain.
 *
 * #### How it works
 *
 * This uses a CloudFront KeyValueStore to store the routing data and a CloudFront
 * function to route the request. As routes are added, the store is updated.
 *
 * So when a request comes in, it does a lookup in the store and dynamically sets
 * the origin based on the routing data. For frontends, that have their server
 * functions deployed to multiple `regions`, it routes to the closest region based
 * on the user's location.
 *
 * You might notice a _placeholder.sst.dev_ behavior in CloudFront. This is not
 * used and is only there because CloudFront requires a default behavior.
 *
 * #### Limits
 *
 * There are some limits on this setup but it's managed by SST.
 *
 * - The CloudFront function can be a maximum of 10KB in size. But because all
 *   the route data is stored in the KeyValueStore, the function can be kept small.
 * - Each value in the KeyValueStore needs to be less than 1KB. This component
 *   splits the routes into multiple values to keep it under the limit.
 * - The KeyValueStore can be a maximum of 5MB. This is fairly large. But to
 *   handle sites that have a lot of files, only top-level assets get individual
 *   entries.
 */
export declare class Router extends Component implements Link.Linkable {
    private constructorName;
    private constructorOpts;
    private cdn;
    private kvStoreArn?;
    private kvNamespace?;
    private hasInlineRoutes;
    constructor(name: string, args?: RouterArgs, opts?: ComponentResourceOptions);
    /**
     * The ID of the Router distribution.
     */
    get distributionID(): Output<string>;
    /**
     * The URL of the Router.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url(): Output<string>;
    /** @internal */
    get _kvStoreArn(): Output<string> | undefined;
    /** @internal */
    get _kvNamespace(): Output<string> | undefined;
    /** @internal */
    get _hasInlineRoutes(): import("@pulumi/pulumi").OutputInstance<boolean>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon CloudFront CDN resource.
         */
        cdn: Output<Cdn>;
    };
    /**
     * Add a route to a destination URL.
     *
     * @param pattern The path prefix to match for this route.
     * @param url The destination URL to route matching requests to.
     * @param args Configure the route.
     *
     * @example
     *
     * You can match a route based on:
     *
     * - A path prefix like `/api`
     * - A domain pattern like `api.example.com`
     * - A combined pattern like `dev.example.com/api`
     *
     * For example, to match a path prefix.
     *
     * ```ts title="sst.config.ts"
     * router.route("/api", "https://api.example.com");
     * ```
     *
     * Or match a domain.
     *
     * ```ts title="sst.config.ts"
     * router.route("api.myapp.com/", "https://api.example.com");
     * ```
     *
     * Or a combined pattern.
     *
     * ```ts title="sst.config.ts"
     * router.route("dev.myapp.com/api", "https://api.example.com");
     * ```
     *
     * You can also rewrite the request path.
     *
     * ```ts title="sst.config.ts"
     * router.route("/api", "https://api.example.com", {
     *   rewrite: {
     *     regex: "^/api/(.*)$",
     *     to: "/$1"
     *   }
     * });
     * ```
     *
     * Here something like `/api/users/profile` will be routed to
     * `https://api.example.com/users/profile`.
     */
    route(pattern: Input<string>, url: Input<string>, args?: Input<RouterUrlRouteArgs>): void;
    /**
     * Add a route to an S3 bucket.
     *
     * @param pattern The path prefix to match for this route.
     * @param bucket The S3 bucket to route matching requests to.
     * @param args Configure the route.
     *
     * @example
     *
     * Let's say you have an S3 bucket that gives CloudFront `access`.
     *
     * ```ts title="sst.config.ts" {2}
     * const bucket = new sst.aws.Bucket("MyBucket", {
     *   access: "cloudfront"
     * });
     * ```
     *
     * You can match a pattern and route to it based on:
     *
     * - A path prefix like `/api`
     * - A domain pattern like `api.example.com`
     * - A combined pattern like `dev.example.com/api`
     *
     * For example, to match a path prefix.
     *
     * ```ts title="sst.config.ts"
     * router.routeBucket("/files", bucket);
     * ```
     *
     * Or match a domain.
     *
     * ```ts title="sst.config.ts"
     * router.routeBucket("files.example.com", bucket);
     * ```
     *
     * Or a combined pattern.
     *
     * ```ts title="sst.config.ts"
     * router.routeBucket("dev.example.com/files", bucket);
     * ```
     *
     * You can also rewrite the request path.
     *
     * ```ts title="sst.config.ts"
     * router.routeBucket("/files", bucket, {
     *   rewrite: {
     *     regex: "^/files/(.*)$",
     *     to: "/$1"
     *   }
     * });
     * ```
     *
     * Here something like `/files/logo.png` will be routed to
     * `/logo.png`.
     */
    routeBucket(pattern: Input<string>, bucket: Input<Bucket>, args?: Input<RouterBucketRouteArgs>): void;
    /**
     * Add a route to a frontend or static site.
     *
     * @param pattern The path prefix to match for this route.
     * @param site The frontend or static site to route matching requests to.
     *
     * @deprecated The `routeSite` function has been deprecated. Set the `route` on the
     * site components to route the site through this Router.
     */
    routeSite(pattern: Input<string>, site: any): void;
    /** @internal */
    getSSTLink(): {
        properties: {
            url: Output<string>;
        };
    };
    /**
     * Reference an existing Router with the given Router distribution ID.
     *
     * @param name The name of the component.
     * @param distributionID The ID of the existing Router distribution.
     * @param opts? Resource options.
     *
     * This is useful when you create a Router in one stage and want to share it in
     * another. It avoids having to create a new Router in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share a Router across stages.
     * :::
     *
     * @example
     * Let's say you create a Router in the `dev` stage. And in your personal stage
     * `frank`, you want to share the same Router.
     *
     * ```ts title="sst.config.ts"
     * const router = $app.stage === "frank"
     *   ? sst.aws.Router.get("MyRouter", "E2IDLMESRN6V62")
     *   : new sst.aws.Router("MyRouter");
     * ```
     *
     * Here `E2IDLMESRN6V62` is the ID of the Router distribution created in the
     * `dev` stage. You can find this by outputting the distribution ID in the `dev`
     * stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   router: router.distributionID
     * };
     * ```
     *
     * Learn more about [how to configure a router for your app](/docs/configure-a-router).
     */
    static get(name: string, distributionID: Input<string>, opts?: ComponentResourceOptions): Router;
}
export declare const CF_BLOCK_CLOUDFRONT_URL_INJECTION = "\nif (event.request.headers.host.value.includes('cloudfront.net')) {\n  return {\n    statusCode: 403,\n    statusDescription: 'Forbidden',\n    body: {\n      encoding: \"text\",\n      data: '<html><head><title>403 Forbidden</title></head><body><center><h1>403 Forbidden</h1></center></body></html>'\n    }\n  };\n}";
export declare const CF_ROUTER_INJECTION = "\nasync function routeSite(kvNamespace, metadata) {\n  const baselessUri = metadata.base\n    ? event.request.uri.replace(metadata.base, \"\")\n    : event.request.uri;\n\n  // Route to S3 files\n  try {\n    // check using baselessUri b/c files are stored in the root\n    const u = decodeURIComponent(baselessUri);\n    const postfixes = u.endsWith(\"/\")\n      ? [\"index.html\"]\n      : [\"\", \".html\", \"/index.html\"];\n    const v = await Promise.any(postfixes.map(p => cf.kvs().get(kvNamespace + \":\" + u + p).then(v => p)));\n    // files are stored in a subdirectory, add it to the request uri\n    event.request.uri = metadata.s3.dir + event.request.uri + v;\n    setS3Origin(metadata.s3.domain);\n    return;\n  } catch (e) {}\n\n  // Route to S3 routes\n  if (metadata.s3 && metadata.s3.routes) {\n    for (var i=0, l=metadata.s3.routes.length; i<l; i++) {\n      const route = metadata.s3.routes[i];\n      if (baselessUri.startsWith(route)) {\n        event.request.uri = metadata.s3.dir + event.request.uri;\n        // uri ends with /, ie. /usage/ -> /usage/index.html\n        if (event.request.uri.endsWith(\"/\")) {\n          event.request.uri += \"index.html\";\n        }\n        // uri ends with non-file, ie. /usage -> /usage/index.html\n        else if (!event.request.uri.split(\"/\").pop().includes(\".\")) {\n          event.request.uri += \"/index.html\";\n        }\n        setS3Origin(metadata.s3.domain);\n        return;\n      }\n    }\n  }\n\n  // Route to S3 custom 404 (no servers)\n  if (metadata.custom404) {\n    event.request.uri = metadata.s3.dir + (metadata.base ? metadata.base : \"\") + metadata.custom404;\n    setS3Origin(metadata.s3.domain);\n    return;\n  }\n\n  // Route to image optimizer\n  if (metadata.image && baselessUri.startsWith(metadata.image.route)) {\n    setUrlOrigin(metadata.image.host);\n    return;\n  }\n\n  // Route to servers\n  if (metadata.servers){\n    event.request.headers[\"x-forwarded-host\"] = event.request.headers.host;\n    \n    for (var key in event.request.querystring) {\n      if (key.includes(\"/\")) {\n        event.request.querystring[encodeURIComponent(key)] = event.request.querystring[key];\n        delete event.request.querystring[key];\n      }\n    }\n    setNextjsGeoHeaders();\n    setNextjsCacheKey();\n    setUrlOrigin(findNearestServer(metadata.servers), metadata.origin);\n  }\n\n  function setNextjsGeoHeaders() {\n    \n    if(event.request.headers[\"cloudfront-viewer-city\"]) {\n      event.request.headers[\"x-open-next-city\"] = event.request.headers[\"cloudfront-viewer-city\"];\n    }\n    if(event.request.headers[\"cloudfront-viewer-country\"]) {\n      event.request.headers[\"x-open-next-country\"] = event.request.headers[\"cloudfront-viewer-country\"];\n    }\n    if(event.request.headers[\"cloudfront-viewer-region\"]) {\n      event.request.headers[\"x-open-next-region\"] = event.request.headers[\"cloudfront-viewer-region\"];\n    }\n    if(event.request.headers[\"cloudfront-viewer-latitude\"]) {\n      event.request.headers[\"x-open-next-latitude\"] = event.request.headers[\"cloudfront-viewer-latitude\"];\n    }\n    if(event.request.headers[\"cloudfront-viewer-longitude\"]) {\n      event.request.headers[\"x-open-next-longitude\"] = event.request.headers[\"cloudfront-viewer-longitude\"];\n    }\n  }\n\n  function setNextjsCacheKey() {\n    \n    var cacheKey = \"\";\n    if (event.request.uri.startsWith(\"/_next/image\")) {\n      cacheKey = getHeader(\"accept\");\n    } else {\n      cacheKey =\n        getHeader(\"rsc\") +\n        getHeader(\"next-router-prefetch\") +\n        getHeader(\"next-router-state-tree\") +\n        getHeader(\"next-url\") +\n        getHeader(\"x-prerender-revalidate\");\n    }\n    if (event.request.cookies[\"__prerender_bypass\"]) {\n      cacheKey += event.request.cookies[\"__prerender_bypass\"]\n        ? event.request.cookies[\"__prerender_bypass\"].value\n        : \"\";\n    }\n    var crypto = require(\"crypto\");\n    var hashedKey = crypto.createHash(\"md5\").update(cacheKey).digest(\"hex\");\n    event.request.headers[\"x-open-next-cache-key\"] = { value: hashedKey };\n  }\n\n  function getHeader(key) {\n    var header = event.request.headers[key];\n    if (header) {\n      if (header.multiValue) {\n        return header.multiValue.map((header) => header.value).join(\",\");\n      }\n      if (header.value) {\n        return header.value;\n      }\n    }\n    return \"\";\n  }\n\n  function findNearestServer(servers) {\n    if (servers.length === 1) return servers[0][0];\n\n    const h = event.request.headers;\n    const lat = h[\"cloudfront-viewer-latitude\"] && h[\"cloudfront-viewer-latitude\"].value;\n    const lon = h[\"cloudfront-viewer-longitude\"] && h[\"cloudfront-viewer-longitude\"].value;\n    if (!lat || !lon) return servers[0][0];\n\n    return servers\n      .map((s) => ({\n        distance: haversineDistance(lat, lon, s[1], s[2]),\n        host: s[0],\n      }))\n      .sort((a, b) => a.distance - b.distance)[0]\n      .host;\n  }\n\n  function haversineDistance(lat1, lon1, lat2, lon2) {\n    const toRad = angle => angle * Math.PI / 180;\n    const radLat1 = toRad(lat1);\n    const radLat2 = toRad(lat2);\n    const dLat = toRad(lat2 - lat1);\n    const dLon = toRad(lon2 - lon1);\n    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) ** 2;\n    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n  }\n}\n\nfunction setUrlOrigin(urlHost, override) {\n  event.request.headers[\"x-forwarded-host\"] = event.request.headers.host;\n  const origin = {\n    domainName: urlHost,\n    customOriginConfig: {\n      port: 443,\n      protocol: \"https\",\n      sslProtocols: [\"TLSv1.2\"],\n    },\n    originAccessControlConfig: {\n      enabled: false,\n    }\n  };\n  override = override ?? {};\n  if (override.protocol === \"http\") {\n    delete origin.customOriginConfig;\n  }\n  if (override.connectionAttempts) {\n    origin.connectionAttempts = override.connectionAttempts;\n  }\n  if (override.timeouts) {\n    origin.timeouts = override.timeouts;\n  }\n  cf.updateRequestOrigin(origin);\n}\n\nfunction setS3Origin(s3Domain, override) {\n  delete event.request.headers[\"Cookies\"];\n  delete event.request.headers[\"cookies\"];\n  delete event.request.cookies;\n\n  const origin = {\n    domainName: s3Domain,\n    originAccessControlConfig: {\n      enabled: true,\n      signingBehavior: \"always\",\n      signingProtocol: \"sigv4\",\n      originType: \"s3\",\n    }\n  };\n  override = override ?? {};\n  if (override.connectionAttempts) {\n    origin.connectionAttempts = override.connectionAttempts;\n  }\n  if (override.timeouts) {\n    origin.timeouts = override.timeouts;\n  }\n  cf.updateRequestOrigin(origin);\n}";
export type KV_SITE_METADATA = {
    base?: string;
    custom404?: string;
    s3: {
        domain: string;
        dir: string;
        routes: string[];
    };
    image?: {
        host: string;
        route: string;
    };
    servers?: [string, number, number][];
    origin?: {
        timeouts: {
            readTimeout: number;
        };
    };
};
export type RouterRouteArgs = {
    /**
     * The `Router` component to use for routing requests.
     *
     * @example
     *
     * Let's say you have a Router component.
     *
     * ```ts title="sst.config.ts"
     * const router = new sst.aws.Router("MyRouter", {
     *   domain: "example.com"
     * });
     * ```
     *
     * You can attach it to the Router, instead of creating a standalone CloudFront
     * distribution.
     *
     * ```ts
     * router: {
     *   instance: router
     * }
     * ```
     */
    instance: Input<Router>;
    /**
     * Route requests matching a specific domain pattern.
     *
     * @example
     *
     * You can serve your resource from a subdomain. For example, if you want to make
     * it available at `https://dev.example.com`, set the `Router` to match the
     * domain or a wildcard.
     *
     * ```ts {2} title="sst.config.ts"
     * const router = new sst.aws.Router("MyRouter", {
     *   domain: "*.example.com"
     * });
     * ```
     *
     * Then set the domain pattern.
     *
     * ```ts {3}
     * router: {
     *   instance: router,
     *   domain: "dev.example.com"
     * }
     * ```
     *
     * While `dev.example.com` matches `*.example.com`. Something like
     * `docs.dev.example.com` will not match `*.example.com`.
     *
     * :::tip
     * Nested wildcards domain patterns are not supported.
     * :::
     *
     * You'll need to add `*.dev.example.com` as an alias.
     */
    domain?: Input<string>;
    /**
     * Route requests matching a specific path prefix.
     *
     * @default `"/"`
     *
     * @example
     *
     * ```ts {3}
     * router: {
     *   instance: router,
     *   path: "/docs"
     * }
     * ```
     */
    path?: Input<string>;
};
export type RouterRouteArgsDeprecated = {
    router: Input<Router>;
    domain?: Input<string>;
    path?: Input<string>;
};
export declare function normalizeRouteArgs(route?: Input<RouterRouteArgs>, routeDeprecated?: Input<RouterRouteArgsDeprecated>): Output<{
    hostPattern: string | undefined;
    pathPrefix: string | undefined;
    routerDistributionId: Output<string>;
    routerUrl: Output<string>;
    routerKvNamespace: Output<string>;
    routerKvStoreArn: Output<string>;
}> | undefined;
export {};
