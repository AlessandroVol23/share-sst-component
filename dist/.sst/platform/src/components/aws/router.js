import { all, interpolate, output, } from "@pulumi/pulumi";
import crypto from "crypto";
import { Component, transform } from "../component";
import { Cdn } from "./cdn";
import { cloudfront } from "@pulumi/aws";
import { hashStringToPrettyString, physicalName } from "../naming";
import { Bucket } from "./bucket";
import { OriginAccessControl } from "./providers/origin-access-control";
import { VisibleError } from "../error";
import { RouterUrlRoute } from "./router-url-route";
import { RouterBucketRoute } from "./router-bucket-route";
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
export class Router extends Component {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
        const _refVersion = 2;
        const self = this;
        this.constructorName = name;
        this.constructorOpts = opts;
        if (args && "ref" in args) {
            const ref = reference();
            this.cdn = output(ref.cdn);
            this.kvStoreArn = ref.kvStoreArn;
            this.kvNamespace = ref.kvNamespace;
            this.hasInlineRoutes = ref.hasInlineRoutes;
            registerOutputs();
            return;
        }
        const hasInlineRoutes = args.routes !== undefined;
        let cdn, kvStoreArn, kvNamespace;
        if (hasInlineRoutes) {
            cdn = handleInlineRoutes();
        }
        else {
            const r = handleLazyRoutes();
            cdn = output(r.distribution);
            kvStoreArn = r.kvStoreArn;
            kvNamespace = output(r.kvNamespace);
        }
        this.cdn = cdn;
        this.kvStoreArn = kvStoreArn;
        this.kvNamespace = kvNamespace;
        this.hasInlineRoutes = output(hasInlineRoutes);
        registerOutputs();
        function reference() {
            const ref = args;
            const cdn = Cdn.get(`${name}Cdn`, ref.distributionID, { parent: self });
            const tags = cdn.nodes.distribution.tags.apply((tags) => {
                if (tags?.["sst:ref:version"] !== _refVersion.toString()) {
                    throw new VisibleError([
                        `There have been some minor changes to the "Router" component that's being referenced by "${name}".\n`,
                        `To update, you'll need to redeploy the stage where the Router was created. And then redeploy this stage.`,
                    ].join("\n"));
                }
                return {
                    kvStoreArn: tags?.["sst:ref:kv"],
                    kvNamespace: tags?.["sst:ref:kv-namespace"],
                    hasInlineRoutes: tags?.["sst:ref:kv"] === undefined,
                };
            });
            return {
                cdn,
                kvStoreArn: tags.kvStoreArn,
                kvNamespace: tags.kvNamespace,
                hasInlineRoutes: tags.hasInlineRoutes,
            };
        }
        function registerOutputs() {
            self.registerOutputs({
                _hint: args._skipHint ? undefined : self.url,
            });
        }
        function handleInlineRoutes() {
            let defaultCachePolicy;
            let defaultCfFunction;
            let defaultOac;
            const routes = normalizeRoutes();
            const cdn = createCdn();
            return cdn;
            function normalizeRoutes() {
                return output(args.routes).apply((routes) => {
                    const normalizedRoutes = Object.fromEntries(Object.entries(routes).map(([path, route]) => {
                        // Route path must start with "/"
                        if (!path.startsWith("/"))
                            throw new Error(`In "${name}" Router, the route path "${path}" must start with a "/"`);
                        route = typeof route === "string" ? { url: route } : route;
                        const hasUrl = "url" in route ? 1 : 0;
                        const hasBucket = "bucket" in route ? 1 : 0;
                        if (hasUrl + hasBucket !== 1)
                            throw new Error(`In "${name}" Router, the route path "${path}" can only have one of url or bucket`);
                        return [path, route];
                    }));
                    normalizedRoutes["/*"] = normalizedRoutes["/*"] ?? {
                        url: "https://do-not-exist.sst.dev",
                    };
                    return normalizedRoutes;
                });
            }
            function createCfRequestDefaultFunction() {
                defaultCfFunction =
                    defaultCfFunction ??
                        new cloudfront.Function(`${name}CloudfrontFunction`, {
                            runtime: "cloudfront-js-2.0",
                            code: [
                                `async function handler(event) {`,
                                `  event.request.headers["x-forwarded-host"] = event.request.headers.host;`,
                                `  return event.request;`,
                                `}`,
                            ].join("\n"),
                        }, { parent: self });
                return defaultCfFunction;
            }
            function createCfRequestFunction(path, config, rewrite, injectHostHeader) {
                return new cloudfront.Function(`${name}CloudfrontFunction${hashStringToPrettyString(path, 8)}`, {
                    runtime: "cloudfront-js-2.0",
                    keyValueStoreAssociations: config?.kvStore
                        ? [config.kvStore]
                        : config?.kvStores ?? [],
                    code: `
async function handler(event) {
  ${injectHostHeader
                        ? `event.request.headers["x-forwarded-host"] = event.request.headers.host;`
                        : ""}
  ${rewrite
                        ? `
const re = new RegExp("${rewrite.regex}");
event.request.uri = event.request.uri.replace(re, "${rewrite.to}");`
                        : ""}
  ${config?.injection ?? ""}
  return event.request;
}`,
                }, { parent: self });
            }
            function createCfResponseFunction(path, config) {
                return new cloudfront.Function(`${name}CloudfrontFunctionResponse${hashStringToPrettyString(path, 8)}`, {
                    runtime: "cloudfront-js-2.0",
                    keyValueStoreAssociations: config.kvStore
                        ? [config.kvStore]
                        : config.kvStores ?? [],
                    code: `
async function handler(event) {
  ${config.injection ?? ""}
  return event.response;
}`,
                }, { parent: self });
            }
            function createOriginAccessControl() {
                defaultOac =
                    defaultOac ??
                        new OriginAccessControl(`${name}S3AccessControl`, { name: physicalName(64, name) }, { parent: self, ignoreChanges: ["name"] });
                return defaultOac;
            }
            function createCachePolicy() {
                defaultCachePolicy =
                    defaultCachePolicy ??
                        new cloudfront.CachePolicy(...transform(args.transform?.cachePolicy, `${name}CachePolicy`, {
                            comment: `${name} router cache policy`,
                            defaultTtl: 0,
                            maxTtl: 31536000, // 1 year
                            minTtl: 0,
                            parametersInCacheKeyAndForwardedToOrigin: {
                                cookiesConfig: {
                                    cookieBehavior: "none",
                                },
                                headersConfig: {
                                    headerBehavior: "none",
                                },
                                queryStringsConfig: {
                                    queryStringBehavior: "all",
                                },
                                enableAcceptEncodingBrotli: true,
                                enableAcceptEncodingGzip: true,
                            },
                        }, { parent: self }));
                return defaultCachePolicy;
            }
            function createCdn() {
                return routes.apply((routes) => {
                    const distributionData = Object.entries(routes).map(([path, route]) => {
                        if ("url" in route) {
                            return {
                                origin: {
                                    originId: path,
                                    domainName: new URL(route.url).host,
                                    customOriginConfig: {
                                        httpPort: 80,
                                        httpsPort: 443,
                                        originProtocolPolicy: "https-only",
                                        originReadTimeout: 20,
                                        originSslProtocols: ["TLSv1.2"],
                                    },
                                },
                                behavior: {
                                    pathPattern: path,
                                    targetOriginId: path,
                                    functionAssociations: [
                                        {
                                            eventType: "viewer-request",
                                            functionArn: route.edge?.viewerRequest || route.rewrite
                                                ? createCfRequestFunction(path, route.edge?.viewerRequest, route.rewrite, true).arn
                                                : createCfRequestDefaultFunction().arn,
                                        },
                                        ...(route.edge?.viewerResponse
                                            ? [
                                                {
                                                    eventType: "viewer-response",
                                                    functionArn: createCfResponseFunction(path, route.edge.viewerResponse).arn,
                                                },
                                            ]
                                            : []),
                                    ],
                                    viewerProtocolPolicy: "redirect-to-https",
                                    allowedMethods: [
                                        "DELETE",
                                        "GET",
                                        "HEAD",
                                        "OPTIONS",
                                        "PATCH",
                                        "POST",
                                        "PUT",
                                    ],
                                    cachedMethods: ["GET", "HEAD"],
                                    defaultTtl: 0,
                                    compress: true,
                                    cachePolicyId: route.cachePolicy ?? createCachePolicy().id,
                                    // CloudFront's Managed-AllViewerExceptHostHeader policy
                                    originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
                                },
                            };
                        }
                        else if ("bucket" in route) {
                            return {
                                origin: {
                                    originId: path,
                                    domainName: route.bucket instanceof Bucket
                                        ? route.bucket.nodes.bucket.bucketRegionalDomainName
                                        : route.bucket,
                                    originPath: "",
                                    originAccessControlId: createOriginAccessControl().id,
                                },
                                behavior: {
                                    pathPattern: path,
                                    targetOriginId: path,
                                    functionAssociations: [
                                        ...(route.edge?.viewerRequest || route.rewrite
                                            ? [
                                                {
                                                    eventType: "viewer-request",
                                                    functionArn: route.edge?.viewerRequest || route.rewrite
                                                        ? createCfRequestFunction(path, route.edge?.viewerRequest, route.rewrite, false).arn
                                                        : createCfRequestDefaultFunction().arn,
                                                },
                                            ]
                                            : []),
                                        ...(route.edge?.viewerResponse
                                            ? [
                                                {
                                                    eventType: "viewer-response",
                                                    functionArn: createCfResponseFunction(path, route.edge.viewerResponse).arn,
                                                },
                                            ]
                                            : []),
                                    ],
                                    viewerProtocolPolicy: "redirect-to-https",
                                    allowedMethods: ["GET", "HEAD", "OPTIONS"],
                                    cachedMethods: ["GET", "HEAD"],
                                    compress: true,
                                    // CloudFront's managed CachingOptimized policy
                                    cachePolicyId: route.cachePolicy ??
                                        "658327ea-f89d-4fab-a63d-7e88639e58f6",
                                },
                            };
                        }
                        throw new Error("Invalid route type");
                    });
                    return new Cdn(...transform(args.transform?.cdn, `${name}Cdn`, {
                        comment: `${name} router`,
                        origins: distributionData.map((d) => d.origin),
                        defaultCacheBehavior: {
                            ...distributionData.find((d) => d.behavior.pathPattern === "/*").behavior,
                            // @ts-expect-error
                            pathPattern: undefined,
                        },
                        orderedCacheBehaviors: distributionData
                            .filter((d) => d.behavior.pathPattern !== "/*")
                            .map((d) => d.behavior),
                        domain: args.domain,
                        wait: true,
                    }, { parent: self }));
                });
            }
        }
        function handleLazyRoutes() {
            const kvNamespace = buildRequestKvNamespace();
            const kvStoreArn = createRequestKvStore();
            const requestFunction = createRequestFunction();
            const responseFunction = createResponseFunction();
            const cachePolicyId = createCachePolicy().id;
            const distribution = createDistribution();
            return { kvNamespace, kvStoreArn, distribution };
            function buildRequestKvNamespace() {
                // In the case multiple routers use the same kv store, we need to namespace the keys
                return crypto
                    .createHash("md5")
                    .update(`${$app.name}-${$app.stage}-${name}`)
                    .digest("hex")
                    .substring(0, 4);
            }
            function createRequestKvStore() {
                return output(args.edge).apply((edge) => {
                    const viewerRequest = edge?.viewerRequest;
                    const userKvStore = viewerRequest?.kvStore;
                    if (userKvStore)
                        return output(userKvStore);
                    return new cloudfront.KeyValueStore(`${name}KvStore`, {}, { parent: self }).arn;
                });
            }
            function createCachePolicy() {
                return new cloudfront.CachePolicy(...transform(args.transform?.cachePolicy, `${name}ServerCachePolicy`, {
                    comment: "SST server response cache policy",
                    defaultTtl: 0,
                    maxTtl: 31536000, // 1 year
                    minTtl: 0,
                    parametersInCacheKeyAndForwardedToOrigin: {
                        cookiesConfig: {
                            cookieBehavior: "none",
                        },
                        headersConfig: {
                            headerBehavior: "whitelist",
                            headers: {
                                items: ["x-open-next-cache-key"],
                            },
                        },
                        queryStringsConfig: {
                            queryStringBehavior: "all",
                        },
                        enableAcceptEncodingBrotli: true,
                        enableAcceptEncodingGzip: true,
                    },
                }, { parent: self }));
            }
            function createRequestFunction() {
                return output(args.edge).apply((edge) => {
                    const userInjection = edge?.viewerRequest?.injection ?? "";
                    const blockCloudfrontUrlInjection = args.domain
                        ? CF_BLOCK_CLOUDFRONT_URL_INJECTION
                        : "";
                    return new cloudfront.Function(`${name}CloudfrontFunctionRequest`, {
                        runtime: "cloudfront-js-2.0",
                        keyValueStoreAssociations: kvStoreArn ? [kvStoreArn] : [],
                        code: interpolate `
import cf from "cloudfront";
async function handler(event) {
  ${userInjection}
  ${blockCloudfrontUrlInjection}
  ${CF_ROUTER_INJECTION}

  const routerNS = "${kvNamespace}";

  async function getRoutes() {
    let routes = [];
    try {
      const v = await cf.kvs().get(routerNS + ":routes");
      routes = JSON.parse(v);

      // handle chunked routes
      if (routes.parts) {
        const chunkPromises = [];
        for (let i = 0; i < routes.parts; i++) {
          chunkPromises.push(cf.kvs().get(routerNS + ":routes:" + i));
        }
        const chunks = await Promise.all(chunkPromises);
        routes = JSON.parse(chunks.join(""));
      }
    } catch (e) {}
    return routes;
  }

  async function matchRoute(routes) {
    const requestHost = event.request.headers.host.value;
    const requestHostWithEscapedDots = requestHost.replace(/\\./g, "\\\\.");
    const requestHostRegexPattern = "^" + requestHost + "$";
    let match;
    routes.forEach(r => {
      ${
                        /*
                        Route format: [type, routeNamespace, hostRegex, pathPrefix]
                        - First sort by host pattern (longest first)
                        - Then sort by path prefix (longest first)
                      */ ""}
      var parts = r.split(",");
      const type = parts[0];
      const routeNs = parts[1];
      const host = parts[2];
      const hostLength = host.length;
      const path = parts[3];
      const pathLength = path.length;

      // Do not consider if the current match is a better winner
      if (match && (
          hostLength < match.hostLength
          || (hostLength === match.hostLength && pathLength < match.pathLength)
      )) return;

      const hostMatches = host === ""
        || host === requestHostWithEscapedDots
        || (host.includes("*") && new RegExp(host).test(requestHostRegexPattern));
      if (!hostMatches) return;

      const pathMatches = event.request.uri.startsWith(path);
      if (!pathMatches) return;

      match = {
        type,
        routeNs,
        host,
        hostLength,
        path,
        pathLength,
      };
    });

    // Load metadata
    if (match) {
      try {
        const type = match.type;
        const routeNs = match.routeNs;
        const v = await cf.kvs().get(routeNs + ":metadata");
        return { type, routeNs, metadata: JSON.parse(v) };
      } catch (e) {}
    }
  }

  // Look up the route
  const routes = await getRoutes();
  const route = await matchRoute(routes);
  if (!route) return event.request;
  if (route.metadata.rewrite) {
    const rw = route.metadata.rewrite;
    event.request.uri = event.request.uri.replace(new RegExp(rw.regex), rw.to);
  }
  if (route.type === "url") setUrlOrigin(route.metadata.host, route.metadata.origin);
  if (route.type === "bucket") setS3Origin(route.metadata.domain, route.metadata.origin);
  if (route.type === "site") await routeSite(route.routeNs, route.metadata);
  return event.request;
}`,
                    }, { parent: self });
                });
            }
            function createResponseFunction() {
                return output(args.edge).apply((edge) => {
                    const userConfig = edge?.viewerResponse;
                    const userInjection = userConfig?.injection;
                    const kvStoreArn = userConfig?.kvStore;
                    if (!userInjection)
                        return;
                    return new cloudfront.Function(`${name}CloudfrontFunctionResponse`, {
                        runtime: "cloudfront-js-2.0",
                        keyValueStoreAssociations: kvStoreArn ? [kvStoreArn] : [],
                        code: `
import cf from "cloudfront";
async function handler(event) {
  ${userInjection}
  return event.response;
}`,
                    }, { parent: self });
                });
            }
            function createDistribution() {
                return new Cdn(...transform(args.transform?.cdn, `${name}Cdn`, {
                    comment: `${name} app`,
                    domain: args.domain,
                    origins: [
                        {
                            originId: "default",
                            domainName: "placeholder.sst.dev",
                            customOriginConfig: {
                                httpPort: 80,
                                httpsPort: 443,
                                originProtocolPolicy: "http-only",
                                originReadTimeout: 20,
                                originSslProtocols: ["TLSv1.2"],
                            },
                        },
                    ],
                    defaultCacheBehavior: {
                        targetOriginId: "default",
                        viewerProtocolPolicy: "redirect-to-https",
                        allowedMethods: [
                            "DELETE",
                            "GET",
                            "HEAD",
                            "OPTIONS",
                            "PATCH",
                            "POST",
                            "PUT",
                        ],
                        cachedMethods: ["GET", "HEAD"],
                        compress: true,
                        cachePolicyId,
                        // CloudFront's Managed-AllViewerExceptHostHeader policy
                        originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
                        functionAssociations: all([
                            requestFunction,
                            responseFunction,
                        ]).apply(([reqFn, resFn]) => [
                            { eventType: "viewer-request", functionArn: reqFn.arn },
                            ...(resFn
                                ? [{ eventType: "viewer-response", functionArn: resFn.arn }]
                                : []),
                        ]),
                    },
                    tags: {
                        "sst:ref:kv": kvStoreArn,
                        "sst:ref:kv-namespace": kvNamespace,
                        "sst:ref:version": _refVersion.toString(),
                    },
                }, { parent: self }));
            }
        }
    }
    /**
     * The ID of the Router distribution.
     */
    get distributionID() {
        return this.cdn.nodes.distribution.id;
    }
    /**
     * The URL of the Router.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url() {
        return all([this.cdn.domainUrl, this.cdn.url]).apply(([domainUrl, url]) => domainUrl ?? url);
    }
    /** @internal */
    get _kvStoreArn() {
        return this.kvStoreArn;
    }
    /** @internal */
    get _kvNamespace() {
        return this.kvNamespace;
    }
    /** @internal */
    get _hasInlineRoutes() {
        return this.hasInlineRoutes;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon CloudFront CDN resource.
             */
            cdn: this.cdn,
        };
    }
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
    route(pattern, url, args) {
        all([pattern, args, this.hasInlineRoutes]).apply(([pattern, args, hasInlineRoutes]) => {
            if (hasInlineRoutes)
                throw new VisibleError("Cannot use both `routes` and `.route()` function to add routes.");
            new RouterUrlRoute(`${this.constructorName}Route${pattern}`, {
                store: this.kvStoreArn,
                routerNamespace: this.kvNamespace,
                pattern,
                url,
                routeArgs: args,
            }, { provider: this.constructorOpts.provider });
        });
    }
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
    routeBucket(pattern, bucket, args) {
        all([pattern, args, this.hasInlineRoutes]).apply(([pattern, args, hasInlineRoutes]) => {
            if (hasInlineRoutes)
                throw new VisibleError("Cannot use both `routes` and `.routeBucket()` function to add routes.");
            new RouterBucketRoute(`${this.constructorName}Route${pattern}`, {
                store: this.kvStoreArn,
                routerNamespace: this.kvNamespace,
                pattern,
                bucket,
                routeArgs: args,
            }, { provider: this.constructorOpts.provider });
        });
    }
    /**
     * Add a route to a frontend or static site.
     *
     * @param pattern The path prefix to match for this route.
     * @param site The frontend or static site to route matching requests to.
     *
     * @deprecated The `routeSite` function has been deprecated. Set the `route` on the
     * site components to route the site through this Router.
     */
    routeSite(pattern, site) {
        throw new VisibleError(`The "routeSite" function has been deprecated. Configure the new "route" prop on the site component to route the site through this Router.`);
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                url: this.url,
            },
        };
    }
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
    static get(name, distributionID, opts) {
        return new Router(name, {
            ref: true,
            distributionID: distributionID,
        }, opts);
    }
}
const __pulumiType = "sst:aws:Router";
// @ts-expect-error
Router.__pulumiType = __pulumiType;
export const CF_BLOCK_CLOUDFRONT_URL_INJECTION = `
if (event.request.headers.host.value.includes('cloudfront.net')) {
  return {
    statusCode: 403,
    statusDescription: 'Forbidden',
    body: {
      encoding: "text",
      data: '<html><head><title>403 Forbidden</title></head><body><center><h1>403 Forbidden</h1></center></body></html>'
    }
  };
}`;
export const CF_ROUTER_INJECTION = `
async function routeSite(kvNamespace, metadata) {
  const baselessUri = metadata.base
    ? event.request.uri.replace(metadata.base, "")
    : event.request.uri;

  // Route to S3 files
  try {
    // check using baselessUri b/c files are stored in the root
    const u = decodeURIComponent(baselessUri);
    const postfixes = u.endsWith("/")
      ? ["index.html"]
      : ["", ".html", "/index.html"];
    const v = await Promise.any(postfixes.map(p => cf.kvs().get(kvNamespace + ":" + u + p).then(v => p)));
    // files are stored in a subdirectory, add it to the request uri
    event.request.uri = metadata.s3.dir + event.request.uri + v;
    setS3Origin(metadata.s3.domain);
    return;
  } catch (e) {}

  // Route to S3 routes
  if (metadata.s3 && metadata.s3.routes) {
    for (var i=0, l=metadata.s3.routes.length; i<l; i++) {
      const route = metadata.s3.routes[i];
      if (baselessUri.startsWith(route)) {
        event.request.uri = metadata.s3.dir + event.request.uri;
        // uri ends with /, ie. /usage/ -> /usage/index.html
        if (event.request.uri.endsWith("/")) {
          event.request.uri += "index.html";
        }
        // uri ends with non-file, ie. /usage -> /usage/index.html
        else if (!event.request.uri.split("/").pop().includes(".")) {
          event.request.uri += "/index.html";
        }
        setS3Origin(metadata.s3.domain);
        return;
      }
    }
  }

  // Route to S3 custom 404 (no servers)
  if (metadata.custom404) {
    event.request.uri = metadata.s3.dir + (metadata.base ? metadata.base : "") + metadata.custom404;
    setS3Origin(metadata.s3.domain);
    return;
  }

  // Route to image optimizer
  if (metadata.image && baselessUri.startsWith(metadata.image.route)) {
    setUrlOrigin(metadata.image.host);
    return;
  }

  // Route to servers
  if (metadata.servers){
    event.request.headers["x-forwarded-host"] = event.request.headers.host;
    ${
// Note: In SvelteKit, form action requests contain "/" in request query string
//  ie. POST request with query string "?/action"
//  CloudFront does not allow query string with "/". It needs to be encoded.
""}
    for (var key in event.request.querystring) {
      if (key.includes("/")) {
        event.request.querystring[encodeURIComponent(key)] = event.request.querystring[key];
        delete event.request.querystring[key];
      }
    }
    setNextjsGeoHeaders();
    setNextjsCacheKey();
    setUrlOrigin(findNearestServer(metadata.servers), metadata.origin);
  }

  function setNextjsGeoHeaders() {
    ${
// Inject the CloudFront viewer country, region, latitude, and longitude headers into
// the request headers for OpenNext to use them for OpenNext to use them
""}
    if(event.request.headers["cloudfront-viewer-city"]) {
      event.request.headers["x-open-next-city"] = event.request.headers["cloudfront-viewer-city"];
    }
    if(event.request.headers["cloudfront-viewer-country"]) {
      event.request.headers["x-open-next-country"] = event.request.headers["cloudfront-viewer-country"];
    }
    if(event.request.headers["cloudfront-viewer-region"]) {
      event.request.headers["x-open-next-region"] = event.request.headers["cloudfront-viewer-region"];
    }
    if(event.request.headers["cloudfront-viewer-latitude"]) {
      event.request.headers["x-open-next-latitude"] = event.request.headers["cloudfront-viewer-latitude"];
    }
    if(event.request.headers["cloudfront-viewer-longitude"]) {
      event.request.headers["x-open-next-longitude"] = event.request.headers["cloudfront-viewer-longitude"];
    }
  }

  function setNextjsCacheKey() {
    ${
// This function is used to improve cache hit ratio by setting the cache key
// based on the request headers and the path. `next/image` only needs the
// accept header, and this header is not useful for the rest of the query
""}
    var cacheKey = "";
    if (event.request.uri.startsWith("/_next/image")) {
      cacheKey = getHeader("accept");
    } else {
      cacheKey =
        getHeader("rsc") +
        getHeader("next-router-prefetch") +
        getHeader("next-router-state-tree") +
        getHeader("next-url") +
        getHeader("x-prerender-revalidate");
    }
    if (event.request.cookies["__prerender_bypass"]) {
      cacheKey += event.request.cookies["__prerender_bypass"]
        ? event.request.cookies["__prerender_bypass"].value
        : "";
    }
    var crypto = require("crypto");
    var hashedKey = crypto.createHash("md5").update(cacheKey).digest("hex");
    event.request.headers["x-open-next-cache-key"] = { value: hashedKey };
  }

  function getHeader(key) {
    var header = event.request.headers[key];
    if (header) {
      if (header.multiValue) {
        return header.multiValue.map((header) => header.value).join(",");
      }
      if (header.value) {
        return header.value;
      }
    }
    return "";
  }

  function findNearestServer(servers) {
    if (servers.length === 1) return servers[0][0];

    const h = event.request.headers;
    const lat = h["cloudfront-viewer-latitude"] && h["cloudfront-viewer-latitude"].value;
    const lon = h["cloudfront-viewer-longitude"] && h["cloudfront-viewer-longitude"].value;
    if (!lat || !lon) return servers[0][0];

    return servers
      .map((s) => ({
        distance: haversineDistance(lat, lon, s[1], s[2]),
        host: s[0],
      }))
      .sort((a, b) => a.distance - b.distance)[0]
      .host;
  }

  function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = angle => angle * Math.PI / 180;
    const radLat1 = toRad(lat1);
    const radLat2 = toRad(lat2);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) ** 2;
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

function setUrlOrigin(urlHost, override) {
  event.request.headers["x-forwarded-host"] = event.request.headers.host;
  const origin = {
    domainName: urlHost,
    customOriginConfig: {
      port: 443,
      protocol: "https",
      sslProtocols: ["TLSv1.2"],
    },
    originAccessControlConfig: {
      enabled: false,
    }
  };
  override = override ?? {};
  if (override.protocol === "http") {
    delete origin.customOriginConfig;
  }
  if (override.connectionAttempts) {
    origin.connectionAttempts = override.connectionAttempts;
  }
  if (override.timeouts) {
    origin.timeouts = override.timeouts;
  }
  cf.updateRequestOrigin(origin);
}

function setS3Origin(s3Domain, override) {
  delete event.request.headers["Cookies"];
  delete event.request.headers["cookies"];
  delete event.request.cookies;

  const origin = {
    domainName: s3Domain,
    originAccessControlConfig: {
      enabled: true,
      signingBehavior: "always",
      signingProtocol: "sigv4",
      originType: "s3",
    }
  };
  override = override ?? {};
  if (override.connectionAttempts) {
    origin.connectionAttempts = override.connectionAttempts;
  }
  if (override.timeouts) {
    origin.timeouts = override.timeouts;
  }
  cf.updateRequestOrigin(origin);
}`;
export function normalizeRouteArgs(route, routeDeprecated) {
    if (!route && !routeDeprecated)
        return undefined;
    return all([route, routeDeprecated]).apply(([route, routeDeprecated]) => {
        const v = route
            ? route
            : { ...routeDeprecated, instance: routeDeprecated.router };
        return v.instance._hasInlineRoutes.apply((hasInlineRoutes) => {
            if (hasInlineRoutes)
                throw new VisibleError("Cannot route the site using the provided router. The Router component uses inline routes which has been deprecated.");
            const pathPrefix = v.path
                ? "/" + v.path.replace(/^\//, "").replace(/\/$/, "")
                : undefined;
            return {
                hostPattern: v.domain
                    ? v.domain
                        .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
                        .replace(/\*/g, ".*") // Replace * with .*
                    : undefined,
                pathPrefix,
                routerDistributionId: v.instance.nodes.cdn.nodes.distribution.id,
                routerUrl: v.instance.url.apply((url) => (v.domain ? `https://${v.domain}` : url) + (pathPrefix ?? "")),
                routerKvNamespace: v.instance._kvNamespace,
                routerKvStoreArn: v.instance._kvStoreArn,
            };
        });
    });
}
