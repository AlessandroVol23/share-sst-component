import path from "path";
import fs from "fs";
import { globSync } from "glob";
import crypto from "crypto";
import { output, all, interpolate, } from "@pulumi/pulumi";
import { Cdn } from "./cdn.js";
import { Function } from "./function.js";
import { Bucket } from "./bucket.js";
import { BucketFiles } from "./providers/bucket-files.js";
import { logicalName } from "../naming.js";
import { Component, transform, } from "../component.js";
import { VisibleError } from "../error.js";
import { Cron } from "./cron.js";
import { getContentType } from "../base/base-site.js";
import { buildApp } from "../base/base-ssr-site.js";
import { cloudfront, getRegionOutput, lambda, Region } from "@pulumi/aws";
import { KvKeys } from "./providers/kv-keys.js";
import { useProvider } from "./helpers/provider.js";
import { Link } from "../link.js";
import { URL_UNAVAILABLE } from "./linkable.js";
import { CF_ROUTER_INJECTION, CF_BLOCK_CLOUDFRONT_URL_INJECTION, normalizeRouteArgs, } from "./router.js";
import { DistributionInvalidation } from "./providers/distribution-invalidation.js";
import { toSeconds } from "../duration.js";
import { KvRoutesUpdate } from "./providers/kv-routes-update.js";
import { CONSOLE_URL, getQuota } from "./helpers/quota.js";
import { toPosix } from "../path.js";
const supportedRegions = {
    "af-south-1": { lat: -33.9249, lon: 18.4241 }, // Cape Town, South Africa
    "ap-east-1": { lat: 22.3193, lon: 114.1694 }, // Hong Kong
    "ap-northeast-1": { lat: 35.6895, lon: 139.6917 }, // Tokyo, Japan
    "ap-northeast-2": { lat: 37.5665, lon: 126.978 }, // Seoul, South Korea
    "ap-northeast-3": { lat: 34.6937, lon: 135.5023 }, // Osaka, Japan
    "ap-southeast-1": { lat: 1.3521, lon: 103.8198 }, // Singapore
    "ap-southeast-2": { lat: -33.8688, lon: 151.2093 }, // Sydney, Australia
    "ap-southeast-3": { lat: -6.2088, lon: 106.8456 }, // Jakarta, Indonesia
    "ap-southeast-4": { lat: -37.8136, lon: 144.9631 }, // Melbourne, Australia
    "ap-southeast-5": { lat: 3.139, lon: 101.6869 }, // Kuala Lumpur, Malaysia
    "ap-southeast-7": { lat: 13.7563, lon: 100.5018 }, // Bangkok, Thailand
    "ap-south-1": { lat: 19.076, lon: 72.8777 }, // Mumbai, India
    "ap-south-2": { lat: 17.385, lon: 78.4867 }, // Hyderabad, India
    "ca-central-1": { lat: 45.5017, lon: -73.5673 }, // Montreal, Canada
    "ca-west-1": { lat: 51.0447, lon: -114.0719 }, // Calgary, Canada
    "cn-north-1": { lat: 39.9042, lon: 116.4074 }, // Beijing, China
    "cn-northwest-1": { lat: 38.4872, lon: 106.2309 }, // Yinchuan, Ningxia
    "eu-central-1": { lat: 50.1109, lon: 8.6821 }, // Frankfurt, Germany
    "eu-central-2": { lat: 47.3769, lon: 8.5417 }, // Zurich, Switzerland
    "eu-north-1": { lat: 59.3293, lon: 18.0686 }, // Stockholm, Sweden
    "eu-south-1": { lat: 45.4642, lon: 9.19 }, // Milan, Italy
    "eu-south-2": { lat: 40.4168, lon: -3.7038 }, // Madrid, Spain
    "eu-west-1": { lat: 53.3498, lon: -6.2603 }, // Dublin, Ireland
    "eu-west-2": { lat: 51.5074, lon: -0.1278 }, // London, UK
    "eu-west-3": { lat: 48.8566, lon: 2.3522 }, // Paris, France
    "il-central-1": { lat: 32.0853, lon: 34.7818 }, // Tel Aviv, Israel
    "me-central-1": { lat: 25.2048, lon: 55.2708 }, // Dubai, UAE
    "me-south-1": { lat: 26.0667, lon: 50.5577 }, // Manama, Bahrain
    "mx-central-1": { lat: 19.4326, lon: -99.1332 }, // Mexico City, Mexico
    "sa-east-1": { lat: -23.5505, lon: -46.6333 }, // São Paulo, Brazil
    "us-east-1": { lat: 39.0438, lon: -77.4874 }, // Ashburn, VA
    "us-east-2": { lat: 39.9612, lon: -82.9988 }, // Columbus, OH
    "us-gov-east-1": { lat: 38.9696, lon: -77.3861 }, // Herndon, VA
    "us-gov-west-1": { lat: 34.0522, lon: -118.2437 }, // Los Angeles, CA
    "us-west-1": { lat: 37.7749, lon: -122.4194 }, // San Francisco, CA
    "us-west-2": { lat: 45.5122, lon: -122.6587 }, // Portland, OR
};
export class SsrSite extends Component {
    constructor(type, name, args = {}, opts = {}) {
        super(type, name, args, opts);
        const self = this;
        validateDeprecatedProps();
        const regions = normalizeRegions();
        const route = normalizeRoute();
        const edge = normalizeEdge();
        const serverTimeout = normalizeServerTimeout();
        const buildCommand = this.normalizeBuildCommand(args);
        const sitePath = regions.apply(() => normalizeSitePath());
        const dev = normalizeDev();
        const purge = output(args.assets).apply((assets) => assets?.purge ?? false);
        if (dev.enabled) {
            const server = createDevServer();
            this.devUrl = dev.url;
            this.registerOutputs({
                _metadata: {
                    mode: "placeholder",
                    path: sitePath,
                    server: server.arn,
                },
                _dev: {
                    ...dev.outputs,
                    aws: { role: server.nodes.role.arn },
                },
            });
            return;
        }
        const outputPath = buildApp(self, name, args, sitePath, buildCommand ?? undefined);
        const bucket = createS3Bucket();
        const plan = validatePlan(this.buildPlan(outputPath, name, args, { bucket }));
        const timeout = all([serverTimeout, plan.server]).apply(([argsTimeout, plan]) => argsTimeout ?? plan?.timeout ?? "20 seconds");
        const servers = createServers();
        const imageOptimizer = createImageOptimizer();
        const assetsUploaded = uploadAssets();
        const kvNamespace = buildKvNamespace();
        let distribution;
        let distributionId;
        let kvStoreArn;
        let invalidationDependsOn = [];
        let prodUrl;
        if (route) {
            kvStoreArn = route.routerKvStoreArn;
            distributionId = route.routerDistributionId;
            invalidationDependsOn = [updateRouterKvRoutes()];
            prodUrl = route.routerUrl;
        }
        else {
            kvStoreArn = createRequestKvStore();
            distribution = createDistribution();
            distributionId = distribution.nodes.distribution.id;
            prodUrl = distribution.domainUrl.apply((domainUrl) => output(domainUrl ?? distribution.url));
        }
        function createCachePolicy() {
            return new cloudfront.CachePolicy(`${name}ServerCachePolicy`, {
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
            }, { parent: self });
        }
        function createRequestKvStore() {
            return edge.apply((edge) => {
                const viewerRequest = edge?.viewerRequest;
                if (viewerRequest?.kvStore)
                    return output(viewerRequest?.kvStore);
                return new cloudfront.KeyValueStore(`${name}KvStore`, {}, { parent: self }).arn;
            });
        }
        function createRequestFunction() {
            return edge.apply((edge) => {
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

  const kvNamespace = "${kvNamespace}";

  // Load metadata
  let metadata;
  try {
    const v = await cf.kvs().get(kvNamespace + ":metadata");
    metadata = JSON.parse(v);
  } catch (e) {}

  await routeSite(kvNamespace, metadata);
  return event.request;
}`,
                }, { parent: self });
            });
        }
        function createResponseFunction() {
            return edge.apply((edge) => {
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
                    cachePolicyId: args.cachePolicy ?? createCachePolicy().id,
                    // CloudFront's Managed-AllViewerExceptHostHeader policy
                    originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
                    functionAssociations: all([
                        createRequestFunction(),
                        createResponseFunction(),
                    ]).apply(([reqFn, resFn]) => [
                        { eventType: "viewer-request", functionArn: reqFn.arn },
                        ...(resFn
                            ? [{ eventType: "viewer-response", functionArn: resFn.arn }]
                            : []),
                    ]),
                },
            }, { parent: self }));
        }
        const kvUpdated = createKvEntries();
        createInvalidation();
        const server = servers.apply((servers) => servers[0]?.server);
        this.bucket = bucket;
        this.cdn = distribution;
        this.server = server;
        this.prodUrl = prodUrl;
        this.registerOutputs({
            _hint: this.url,
            _metadata: {
                mode: "deployed",
                path: sitePath,
                url: this.url,
                edge: false,
                server: server.arn,
            },
            _dev: {
                ...dev.outputs,
                aws: { role: server.nodes.role.arn },
            },
        });
        function validateDeprecatedProps() {
            if (args.cdn !== undefined)
                throw new VisibleError(`"cdn" prop is deprecated. Use the "route.router" prop instead to use an existing "Router" component to serve your site.`);
        }
        function normalizeDev() {
            const enabled = $dev && args.dev !== false;
            const devArgs = args.dev || {};
            return {
                enabled,
                url: output(devArgs.url ?? URL_UNAVAILABLE),
                outputs: {
                    title: devArgs.title,
                    command: output(devArgs.command ?? "npm run dev"),
                    autostart: output(devArgs.autostart ?? true),
                    directory: output(devArgs.directory ?? sitePath),
                    environment: args.environment,
                    links: output(args.link || [])
                        .apply(Link.build)
                        .apply((links) => links.map((link) => link.name)),
                },
            };
        }
        function normalizeSitePath() {
            return output(args.path).apply((sitePath) => {
                if (!sitePath)
                    return ".";
                if (!fs.existsSync(sitePath)) {
                    throw new VisibleError(`Site directory not found at "${path.resolve(sitePath)}". Please check the path setting in your configuration.`);
                }
                return sitePath;
            });
        }
        function normalizeRegions() {
            return output(args.regions ?? [getRegionOutput(undefined, { parent: self }).name]).apply((regions) => {
                if (regions.length === 0)
                    throw new VisibleError("No deployment regions specified. Please specify at least one region in the 'regions' property.");
                return regions.map((region) => {
                    if ([
                        "ap-south-2",
                        "ap-southeast-4",
                        "ap-southeast-5",
                        "ca-west-1",
                        "eu-south-2",
                        "eu-central-2",
                        "il-central-1",
                        "me-central-1",
                    ].includes(region))
                        throw new VisibleError(`Region ${region} is not supported by this component. Please select a different AWS region.`);
                    if (!Object.values(Region).includes(region))
                        throw new VisibleError(`Invalid AWS region: "${region}". Please specify a valid AWS region.`);
                    return region;
                });
            });
        }
        function normalizeRoute() {
            const route = normalizeRouteArgs(args.router, args.route);
            if (route) {
                if (args.domain)
                    throw new VisibleError(`Cannot provide both "domain" and "route". Use the "domain" prop on the "Router" component when serving your site through a Router.`);
                if (args.edge)
                    throw new VisibleError(`Cannot provide both "edge" and "route". Use the "edge" prop on the "Router" component when serving your site through a Router.`);
            }
            return route;
        }
        function normalizeEdge() {
            return output([args.edge, args.server?.edge]).apply(([edge, serverEdge]) => {
                if (serverEdge)
                    throw new VisibleError(`The "server.edge" prop is deprecated. Use the "edge" prop on the top level instead.`);
                if (!edge)
                    return edge;
                return edge;
            });
        }
        function normalizeServerTimeout() {
            return output(args.server?.timeout).apply((v) => {
                if (!v)
                    return v;
                const seconds = toSeconds(v);
                if (seconds > 60) {
                    getQuota("cloudfront-response-timeout").apply((quota) => {
                        if (seconds > quota)
                            throw new VisibleError(`Server timeout for "${name}" is longer than the allowed CloudFront response timeout of ${quota} seconds. You can contact AWS Support to increase the timeout - ${CONSOLE_URL}`);
                    });
                }
                return v;
            });
        }
        function createDevServer() {
            return new Function(...transform(args.transform?.server, `${name}DevServer`, {
                description: `${name} dev server`,
                runtime: "nodejs20.x",
                timeout: "20 seconds",
                memory: "128 MB",
                bundle: path.join($cli.paths.platform, "functions", "empty-function"),
                handler: "index.handler",
                environment: args.environment,
                permissions: args.permissions,
                link: args.link,
                dev: false,
            }, { parent: self }));
        }
        function validatePlan(plan) {
            return all([plan, route]).apply(([plan, route]) => {
                if (plan.base) {
                    // starts with /
                    plan.base = !plan.base.startsWith("/") ? `/${plan.base}` : plan.base;
                    // does not end with /
                    plan.base = plan.base.replace(/\/$/, "");
                }
                if (route?.pathPrefix && route.pathPrefix !== "/") {
                    if (!plan.base)
                        throw new VisibleError(`No base path found for site. You must configure the base path to match the route path prefix "${route.pathPrefix}".`);
                    if (!plan.base.startsWith(route.pathPrefix))
                        throw new VisibleError(`The site base path "${plan.base}" must start with the route path prefix "${route.pathPrefix}".`);
                }
                // if copy.to has a leading slash, files will be uploaded to `/` folder in bucket
                plan.assets.forEach((copy) => {
                    copy.to = copy.to.replace(/^\/|\/$/g, "");
                });
                if (plan.isrCache) {
                    plan.isrCache.to = plan.isrCache.to.replace(/^\/|\/$/g, "");
                }
                return plan;
            });
        }
        function createS3Bucket() {
            return new Bucket(...transform(args.transform?.assets, `${name}Assets`, { access: "cloudfront" }, { parent: self, retainOnDelete: false }));
        }
        function createServers() {
            return all([regions, plan.server]).apply(([regions, planServer]) => {
                if (!planServer)
                    return [];
                return regions.map((region) => {
                    const provider = useProvider(region);
                    const server = new Function(...transform(args.transform?.server, `${name}Server${logicalName(region)}`, {
                        ...planServer,
                        description: planServer.description ?? `${name} server`,
                        runtime: output(args.server?.runtime).apply((v) => v ?? planServer.runtime ?? "nodejs20.x"),
                        timeout,
                        memory: output(args.server?.memory).apply((v) => v ?? planServer.memory ?? "1024 MB"),
                        architecture: output(args.server?.architecture).apply((v) => v ?? planServer.architecture ?? "x86_64"),
                        vpc: args.vpc,
                        nodejs: {
                            format: "esm",
                            install: args.server?.install,
                            loader: args.server?.loader,
                            ...planServer.nodejs,
                        },
                        environment: output(args.environment).apply((environment) => ({
                            ...environment,
                            ...planServer.environment,
                        })),
                        permissions: output(args.permissions).apply((permissions) => [
                            {
                                actions: ["cloudfront:CreateInvalidation"],
                                resources: ["*"],
                            },
                            ...(permissions ?? []),
                            ...(planServer.permissions ?? []),
                        ]),
                        injections: [
                            ...(args.warm
                                ? [useServerWarmingInjection(planServer.streaming)]
                                : []),
                            ...(planServer.injections || []),
                        ],
                        link: output(args.link).apply((link) => [
                            ...(planServer.link ?? []),
                            ...(link ?? []),
                        ]),
                        layers: output(args.server?.layers).apply((layers) => [
                            ...(planServer.layers ?? []),
                            ...(layers ?? []),
                        ]),
                        url: true,
                        dev: false,
                        _skipHint: true,
                    }, { provider, parent: self }));
                    if (args.warm) {
                        // Create cron job
                        const cron = new Cron(`${name}Warmer${logicalName(region)}`, {
                            schedule: "rate(5 minutes)",
                            job: {
                                description: `${name} warmer`,
                                bundle: path.join($cli.paths.platform, "dist", "ssr-warmer"),
                                runtime: "nodejs20.x",
                                handler: "index.handler",
                                timeout: "900 seconds",
                                memory: "128 MB",
                                dev: false,
                                environment: {
                                    FUNCTION_NAME: server.nodes.function.name,
                                    CONCURRENCY: output(args.warm).apply((warm) => warm.toString()),
                                },
                                link: [server],
                                _skipMetadata: true,
                            },
                            transform: {
                                target: (args) => {
                                    args.retryPolicy = {
                                        maximumRetryAttempts: 0,
                                        maximumEventAgeInSeconds: 60,
                                    };
                                },
                            },
                        }, { provider, parent: self });
                        // Prewarm on deploy
                        new lambda.Invocation(`${name}Prewarm${logicalName(region)}`, {
                            functionName: cron.nodes.job.name,
                            triggers: {
                                version: Date.now().toString(),
                            },
                            input: JSON.stringify({}),
                        }, { provider, parent: self });
                    }
                    return { region, server };
                });
            });
        }
        function createImageOptimizer() {
            return output(plan.imageOptimizer).apply((imageOptimizer) => {
                if (!imageOptimizer)
                    return;
                return new Function(`${name}ImageOptimizer`, {
                    timeout: "25 seconds",
                    logging: {
                        retention: "3 days",
                    },
                    permissions: [
                        {
                            actions: ["s3:GetObject"],
                            resources: [interpolate `${bucket.arn}/*`],
                        },
                    ],
                    ...imageOptimizer.function,
                    url: true,
                    dev: false,
                    _skipMetadata: true,
                    _skipHint: true,
                }, { parent: self });
            });
        }
        function useServerWarmingInjection(streaming) {
            return [
                `if (event.type === "warmer") {`,
                `  const p = new Promise((resolve) => {`,
                `    setTimeout(() => {`,
                `      resolve({ serverId: "server-" + Math.random().toString(36).slice(2, 8) });`,
                `    }, event.delay);`,
                `  });`,
                ...(streaming
                    ? [
                        `  const response = await p;`,
                        `  responseStream.write(JSON.stringify(response));`,
                        `  responseStream.end();`,
                        `  return;`,
                    ]
                    : [`  return p;`]),
                `}`,
            ].join("\n");
        }
        function uploadAssets() {
            return all([args.assets, route, plan, outputPath]).apply(async ([assets, route, plan, outputPath]) => {
                // Define content headers
                const versionedFilesTTL = 31536000; // 1 year
                const nonVersionedFilesTTL = 86400; // 1 day
                const bucketFiles = [];
                // Handle each copy source
                for (const copy of [
                    ...plan.assets,
                    ...(plan.isrCache
                        ? [{ ...plan.isrCache, versionedSubDir: undefined }]
                        : []),
                ]) {
                    // Build fileOptions
                    const fileOptions = [
                        // unversioned files
                        {
                            files: "**",
                            ignore: copy.versionedSubDir
                                ? toPosix(path.join(copy.versionedSubDir, "**"))
                                : undefined,
                            cacheControl: assets?.nonVersionedFilesCacheHeader ??
                                `public,max-age=0,s-maxage=${nonVersionedFilesTTL},stale-while-revalidate=${nonVersionedFilesTTL}`,
                        },
                        // versioned files
                        ...(copy.versionedSubDir
                            ? [
                                {
                                    files: toPosix(path.join(copy.versionedSubDir, "**")),
                                    cacheControl: assets?.versionedFilesCacheHeader ??
                                        `public,max-age=${versionedFilesTTL},immutable`,
                                },
                            ]
                            : []),
                        ...(assets?.fileOptions ?? []),
                    ];
                    // Upload files based on fileOptions
                    const filesUploaded = [];
                    for (const fileOption of fileOptions.reverse()) {
                        const files = globSync(fileOption.files, {
                            cwd: path.resolve(outputPath, copy.from),
                            nodir: true,
                            dot: true,
                            ignore: fileOption.ignore,
                        }).filter((file) => !filesUploaded.includes(file));
                        bucketFiles.push(...(await Promise.all(files.map(async (file) => {
                            const source = path.resolve(outputPath, copy.from, file);
                            const content = await fs.promises.readFile(source, "utf-8");
                            const hash = crypto
                                .createHash("sha256")
                                .update(content)
                                .digest("hex");
                            return {
                                source,
                                key: toPosix(path.join(copy.to, route?.pathPrefix?.replace(/^\//, "") ?? "", file)),
                                hash,
                                cacheControl: fileOption.cacheControl,
                                contentType: fileOption.contentType ?? getContentType(file, "UTF-8"),
                            };
                        }))));
                        filesUploaded.push(...files);
                    }
                }
                return new BucketFiles(`${name}AssetFiles`, {
                    bucketName: bucket.name,
                    files: bucketFiles,
                    purge,
                    region: getRegionOutput(undefined, { parent: self }).name,
                }, { parent: self });
            });
        }
        function buildKvNamespace() {
            // In the case multiple sites use the same kv store, we need to namespace the keys
            return crypto
                .createHash("md5")
                .update(`${$app.name}-${$app.stage}-${name}`)
                .digest("hex")
                .substring(0, 4);
        }
        function createKvEntries() {
            const entries = all([
                servers,
                imageOptimizer,
                outputPath,
                plan,
                bucket.nodes.bucket.bucketRegionalDomainName,
                timeout,
            ]).apply(([servers, imageOptimizer, outputPath, plan, bucketDomain, timeout]) => all([
                servers.map((s) => ({ region: s.region, url: s.server.url })),
                imageOptimizer?.url,
            ]).apply(([servers, imageOptimizerUrl]) => {
                const kvEntries = {};
                const dirs = [];
                // Router append .html and index.html suffixes to requests to s3 routes:
                // - `.well-known` contain files without suffix, hence will be appended .html
                // - in the future, it might make sense for each dir to have props that controls
                //   the suffixes ie. "handleTrailingSlashse"
                const expandDirs = [".well-known"];
                plan.assets.forEach((copy) => {
                    const processDir = (childPath = "", level = 0) => {
                        const currentPath = path.join(outputPath, copy.from, childPath);
                        fs.readdirSync(currentPath, { withFileTypes: true }).forEach((item) => {
                            // File: add to kvEntries
                            if (item.isFile()) {
                                kvEntries[toPosix(path.join("/", childPath, item.name))] =
                                    "s3";
                                return;
                            }
                            // Directory + deep routes: recursively process it
                            //   In Next.js, asset requests are prefixed with is /_next/static,
                            //   and image optimization requests are prefixed with /_next/image.
                            //   We cannot route by 1 level of subdirs (ie. /_next/`), so we need
                            //   to route by 2 levels of subdirs.
                            // Directory + expand: recursively process it
                            if (level === 0 &&
                                (expandDirs.includes(item.name) ||
                                    item.name === copy.deepRoute)) {
                                processDir(path.join(childPath, item.name), level + 1);
                                return;
                            }
                            // Directory + NOT expand: add to route
                            dirs.push(toPosix(path.join("/", childPath, item.name)));
                        });
                    };
                    processDir();
                });
                kvEntries["metadata"] = JSON.stringify({
                    base: plan.base,
                    custom404: plan.custom404,
                    s3: {
                        domain: bucketDomain,
                        dir: plan.assets[0].to ? "/" + plan.assets[0].to : "",
                        routes: dirs,
                    },
                    image: imageOptimizerUrl
                        ? {
                            host: new URL(imageOptimizerUrl).host,
                            route: plan.imageOptimizer.prefix,
                        }
                        : undefined,
                    servers: servers.map((s) => [
                        new URL(s.url).host,
                        supportedRegions[s.region].lat,
                        supportedRegions[s.region].lon,
                    ]),
                    origin: {
                        timeouts: {
                            readTimeout: toSeconds(timeout),
                        },
                    },
                });
                return kvEntries;
            }));
            return new KvKeys(`${name}KvKeys`, {
                store: kvStoreArn,
                namespace: kvNamespace,
                entries,
                purge,
            }, { parent: self });
        }
        function updateRouterKvRoutes() {
            return new KvRoutesUpdate(`${name}RoutesUpdate`, {
                store: route.routerKvStoreArn,
                namespace: route.routerKvNamespace,
                key: "routes",
                entry: route.apply((route) => ["site", kvNamespace, route.hostPattern, route.pathPrefix].join(",")),
            }, { parent: self });
        }
        function createInvalidation() {
            all([args.invalidation, outputPath, plan]).apply(([invalidationRaw, outputPath, plan]) => {
                // Normalize invalidation
                if (invalidationRaw === false)
                    return;
                const invalidation = {
                    wait: false,
                    paths: "all",
                    ...invalidationRaw,
                };
                // We will generate a hash based on the contents of the S3 files with cache enabled.
                // This will be used to determine if we need to invalidate our CloudFront cache.
                const s3Origin = plan.assets;
                const cachedS3Files = s3Origin.filter((file) => file.cached);
                if (cachedS3Files.length === 0)
                    return;
                // Build invalidation paths
                const invalidationPaths = [];
                if (invalidation.paths === "all") {
                    invalidationPaths.push("/*");
                }
                else if (invalidation.paths === "versioned") {
                    cachedS3Files.forEach((item) => {
                        if (!item.versionedSubDir)
                            return;
                        invalidationPaths.push(toPosix(path.join("/", item.to, item.versionedSubDir, "*")));
                    });
                }
                else {
                    invalidationPaths.push(...(invalidation?.paths || []));
                }
                if (invalidationPaths.length === 0)
                    return;
                // Build build ID
                let invalidationBuildId;
                if (plan.buildId) {
                    invalidationBuildId = plan.buildId;
                }
                else {
                    const hash = crypto.createHash("md5");
                    cachedS3Files.forEach((item) => {
                        // The below options are needed to support following symlinks when building zip files:
                        // - nodir: This will prevent symlinks themselves from being copied into the zip.
                        // - follow: This will follow symlinks and copy the files within.
                        // For versioned files, use file path for digest since file version in name should change on content change
                        if (item.versionedSubDir) {
                            globSync("**", {
                                dot: true,
                                nodir: true,
                                follow: true,
                                cwd: path.resolve(outputPath, item.from, item.versionedSubDir),
                            }).forEach((filePath) => hash.update(filePath));
                        }
                        // For non-versioned files, use file content for digest
                        if (invalidation.paths !== "versioned") {
                            globSync("**", {
                                ignore: item.versionedSubDir
                                    ? [toPosix(path.join(item.versionedSubDir, "**"))]
                                    : undefined,
                                dot: true,
                                nodir: true,
                                follow: true,
                                cwd: path.resolve(outputPath, item.from),
                            }).forEach((filePath) => hash.update(fs.readFileSync(path.resolve(outputPath, item.from, filePath), "utf-8")));
                        }
                    });
                    invalidationBuildId = hash.digest("hex");
                }
                new DistributionInvalidation(`${name}Invalidation`, {
                    distributionId,
                    paths: invalidationPaths,
                    version: invalidationBuildId,
                    wait: invalidation.wait,
                }, {
                    parent: self,
                    dependsOn: [assetsUploaded, kvUpdated, ...invalidationDependsOn],
                });
            });
        }
    }
    /**
     * The URL of the Astro site.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url() {
        return all([this.prodUrl, this.devUrl]).apply(([prodUrl, devUrl]) => (prodUrl ?? devUrl));
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The AWS Lambda server function that renders the site.
             */
            server: this.server,
            /**
             * The Amazon S3 Bucket that stores the assets.
             */
            assets: this.bucket,
            /**
             * The Amazon CloudFront CDN that serves the site.
             */
            cdn: this.cdn,
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                url: this.url,
            },
        };
    }
}
