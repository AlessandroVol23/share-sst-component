import fs from "fs";
import path from "path";
import crypto from "crypto";
import archiver from "archiver";
import { glob } from "glob";
import { all, asset, interpolate, output, secret, unsecret, } from "@pulumi/pulumi";
import { bootstrap } from "./helpers/bootstrap.js";
import { toSeconds } from "../duration.js";
import { toMBs } from "../size.js";
import { Component, transform } from "../component.js";
import { Link } from "../link.js";
import { VisibleError } from "../error.js";
import { physicalName } from "../naming.js";
import { RETENTION } from "./logging.js";
import { cloudwatch, ecr, getCallerIdentityOutput, getPartitionOutput, getRegionOutput, iam, lambda, s3, } from "@pulumi/aws";
import { permission } from "./permission.js";
import { Vpc } from "./vpc.js";
import { Image } from "@pulumi/docker-build";
import { rpc } from "../rpc/rpc.js";
import { parseRoleArn } from "./helpers/arn.js";
import { RandomBytes } from "@pulumi/random";
import { lazy } from "../../util/lazy.js";
import { Efs } from "./efs.js";
import { FunctionEnvironmentUpdate } from "./providers/function-environment-update.js";
import { warnOnce } from "../../util/warn.js";
import { normalizeRouteArgs, } from "./router.js";
import { KvRoutesUpdate } from "./providers/kv-routes-update.js";
import { KvKeys } from "./providers/kv-keys.js";
/**
 * The `Function` component lets you add serverless functions to your app.
 * It uses [AWS Lambda](https://aws.amazon.com/lambda/).
 *
 * #### Supported runtimes
 *
 * Currently supports **Node.js** and **Golang** functions. **Python** and **Rust**
 * are community supported. Other runtimes are on the roadmap.
 *
 * @example
 *
 * #### Minimal example
 *
 *
 * <Tabs>
 *   <TabItem label="Node">
 *   Pass in the path to your handler function.
 *
 *   ```ts title="sst.config.ts"
 *   new sst.aws.Function("MyFunction", {
 *     handler: "src/lambda.handler"
 *   });
 *   ```
 *
 *   [Learn more below](#handler).
 *   </TabItem>
 *   <TabItem label="Python">
 *   Pass in the path to your handler function.
 *
 *   ```ts title="sst.config.ts"
 *   new sst.aws.Function("MyFunction", {
 *     runtime: "python3.11",
 *     handler: "functions/src/functions/api.handler"
 *   });
 *   ```
 *
 *   You need to have uv installed and your handler function needs to be in a uv workspace. [Learn more below](#handler).
 *   </TabItem>
 *   <TabItem label="Go">
 *   Pass in the directory to your Go module.
 *
 *   ```ts title="sst.config.ts"
 *   new sst.aws.Function("MyFunction", {
 *     runtime: "go",
 *     handler: "./src"
 *   });
 *   ```
 *
 *   [Learn more below](#handler).
 *   </TabItem>
 *   <TabItem label="Rust">
 *   Pass in the directory where your Cargo.toml lives.
 *
 *   ```ts title="sst.config.ts"
 *   new sst.aws.Function("MyFunction", {
 *     runtime: "rust",
 *     handler: "./crates/api/"
 *   });
 *   ```
 *
 *   [Learn more below](#handler).
 *   </TabItem>
 * </Tabs>
 *
 * #### Set additional config
 *
 * Pass in additional Lambda config.
 *
 * ```ts {3,4} title="sst.config.ts"
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   timeout: "3 minutes",
 *   memory: "1024 MB"
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to the function. This will grant permissions
 * to the resources and allow you to access it in your handler.
 *
 * ```ts {5} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your handler.
 *
 * <Tabs>
 *   <TabItem label="Node">
 *   ```ts title="src/lambda.ts"
 *   import { Resource } from "sst";
 *
 *   console.log(Resource.MyBucket.name);
 *   ```
 *   </TabItem>
 *   <TabItem label="Python">
 *   ```ts title="functions/src/functions/api.py"
 *   from sst import Resource
 *
 *   def handler(event, context):
 *       print(Resource.MyBucket.name)
 *   ```
 *
 *   Where the `sst` package can be added to your `pyproject.toml`.
 *
 *   ```toml title="functions/pyproject.toml"
 *   [tool.uv.sources]
 *   sst = { git = "https://github.com/sst/sst.git", subdirectory = "sdk/python", branch = "dev" }
 *   ```
 *   </TabItem>
 *   <TabItem label="Go">
 *   ```go title="src/main.go"
 *   import (
 *     "github.com/sst/sst/v3/sdk/golang/resource"
 *   )
 *
 *   resource.Get("MyBucket", "name")
 *   ```
 *   </TabItem>
 *   <TabItem label="Rust">
 *   ```rust title="src/main.rs"
 *   use sst_sdk::Resource;
 *   #[derive(serde::Deserialize, Debug)]
 *   struct Bucket {
 *      name: String,
 *   }
 *
 *   let resource = Resource::init().unwrap();
 *   let Bucket { name } = resource.get("Bucket").unwrap();
 *   ```
 *   </TabItem>
 * </Tabs>
 *
 * #### Set environment variables
 *
 * Set environment variables that you can read in your function. For example, using
 * `process.env` in your Node.js functions.
 *
 * ```ts {4} title="sst.config.ts"
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   environment: {
 *     DEBUG: "true"
 *   }
 * });
 * ```
 *
 * #### Enable function URLs
 *
 * Enable function URLs to invoke the function over HTTP.
 *
 * ```ts {3} title="sst.config.ts"
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   url: true
 * });
 * ```
 *
 * #### Bundling
 *
 * Customize how SST uses [esbuild](https://esbuild.github.io/) to bundle your Node.js
 * functions with the `nodejs` property.
 *
 * ```ts title="sst.config.ts" {3-5}
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   nodejs: {
 *     install: ["pg"]
 *   }
 * });
 * ```
 *
 * Or override it entirely by passing in your own function `bundle`.
 */
export class Function extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        this.constructorName = name;
        const parent = this;
        const dev = normalizeDev();
        const isContainer = all([args.python, dev]).apply(([python, dev]) => !dev && (python?.container ?? false));
        const partition = getPartitionOutput({}, opts).partition;
        const region = getRegionOutput({}, opts).name;
        const bootstrapData = region.apply((region) => bootstrap.forRegion(region));
        const injections = normalizeInjections();
        const runtime = output(args.runtime ?? "nodejs20.x");
        const timeout = normalizeTimeout();
        const memory = normalizeMemory();
        const storage = output(args.storage).apply((v) => v ?? "512 MB");
        const architecture = output(args.architecture).apply((v) => v ?? "x86_64");
        const environment = normalizeEnvironment();
        const streaming = normalizeStreaming();
        const logging = normalizeLogging();
        const volume = normalizeVolume();
        const url = normalizeUrl();
        const copyFiles = normalizeCopyFiles();
        const policies = output(args.policies ?? []);
        const vpc = normalizeVpc();
        const linkData = buildLinkData();
        const linkPermissions = buildLinkPermissions();
        const { bundle, handler: handler0, sourcemaps } = buildHandler();
        const { handler, wrapper } = buildHandlerWrapper();
        const role = createRole();
        const imageAsset = createImageAsset();
        const logGroup = createLogGroup();
        const zipAsset = createZipAsset();
        const fn = createFunction();
        const urlEndpoint = createUrl();
        createProvisioned();
        const eventInvokeConfig = createEventInvokeConfig();
        const links = linkData.apply((input) => input.map((item) => item.name));
        this.function = fn;
        this.role = role;
        this.logGroup = logGroup;
        this.urlEndpoint = urlEndpoint;
        this.eventInvokeConfig = eventInvokeConfig;
        const buildInput = output({
            functionID: name,
            handler: args.handler,
            bundle: args.bundle,
            logGroup: logGroup.apply((l) => l?.name),
            encryptionKey: Function.encryptionKey().base64,
            runtime,
            links: output(linkData).apply((input) => Object.fromEntries(input.map((item) => [item.name, item.properties]))),
            copyFiles,
            properties: output({ nodejs: args.nodejs, python: args.python }).apply((val) => ({
                ...(val.nodejs || val.python),
                architecture,
            })),
            dev,
        });
        buildInput.apply(async (input) => {
            if (!input.dev)
                return;
            await rpc.call("Runtime.AddTarget", input);
        });
        this.registerOutputs({
            _live: unsecret(output(dev).apply((dev) => {
                if (!dev)
                    return undefined;
                return all([
                    name,
                    links,
                    args.handler,
                    args.bundle,
                    args.runtime,
                    args.nodejs,
                    copyFiles,
                ]).apply(([name, links, handler, bundle, runtime, nodejs, copyFiles]) => {
                    return {
                        functionID: name,
                        links,
                        handler: handler,
                        bundle: bundle,
                        runtime: runtime || "nodejs20.x",
                        copyFiles,
                        properties: nodejs,
                    };
                });
            })),
            _metadata: {
                handler: args.handler,
                internal: args._skipMetadata,
                dev: dev,
            },
            _hint: args._skipHint ? undefined : urlEndpoint,
        });
        function normalizeDev() {
            return all([args.dev, args.live]).apply(([d, l]) => $dev && d !== false && l !== false);
        }
        function normalizeInjections() {
            return output(args.injections).apply((injections) => injections ?? []);
        }
        function normalizeTimeout() {
            return output(args.timeout).apply((timeout) => timeout ?? "20 seconds");
        }
        function normalizeMemory() {
            return output(args.memory).apply((memory) => memory ?? "1024 MB");
        }
        function normalizeEnvironment() {
            return all([
                args.environment,
                dev,
                bootstrapData,
                Function.encryptionKey().base64,
                args.link,
            ]).apply(async ([environment, dev, bootstrap, key, link]) => {
                const result = environment ?? {};
                result.SST_RESOURCE_App = JSON.stringify({
                    name: $app.name,
                    stage: $app.stage,
                });
                for (const linkable of link || []) {
                    if (!Link.isLinkable(linkable))
                        continue;
                    const def = linkable.getSSTLink();
                    for (const item of def.include || []) {
                        if (item.type === "environment")
                            Object.assign(result, item.env);
                    }
                }
                result.SST_KEY = key;
                result.SST_KEY_FILE = "resource.enc";
                if (dev) {
                    const appsync = await Function.appsync();
                    result.SST_REGION = process.env.SST_AWS_REGION;
                    result.SST_APPSYNC_HTTP = appsync.http;
                    result.SST_APPSYNC_REALTIME = appsync.realtime;
                    result.SST_FUNCTION_ID = name;
                    result.SST_APP = $app.name;
                    result.SST_STAGE = $app.stage;
                    result.SST_ASSET_BUCKET = bootstrap.asset;
                    if (process.env.SST_FUNCTION_TIMEOUT) {
                        result.SST_FUNCTION_TIMEOUT = process.env.SST_FUNCTION_TIMEOUT;
                    }
                }
                return result;
            });
        }
        function normalizeStreaming() {
            return output(args.streaming).apply((streaming) => streaming ?? false);
        }
        function normalizeLogging() {
            return output(args.logging).apply((logging) => {
                if (logging === false)
                    return undefined;
                if (logging?.retention && logging?.logGroup) {
                    throw new VisibleError(`Cannot set both "logging.retention" and "logging.logGroup"`);
                }
                return {
                    logGroup: logging?.logGroup,
                    retention: logging?.retention ?? "1 month",
                    format: logging?.format ?? "text",
                };
            });
        }
        function normalizeVolume() {
            if (!args.volume)
                return;
            return output(args.volume).apply((volume) => ({
                efs: volume.efs instanceof Efs
                    ? volume.efs.nodes.accessPoint.arn
                    : output(volume.efs),
                path: volume.path ?? "/mnt/efs",
            }));
        }
        function normalizeUrl() {
            return output(args.url).apply((url) => {
                if (url === false || url === undefined)
                    return;
                if (url === true) {
                    url = {};
                }
                // normalize authorization
                const defaultAuthorization = "none";
                const authorization = url.authorization ?? defaultAuthorization;
                // normalize cors
                const defaultCors = {
                    allowHeaders: ["*"],
                    allowMethods: ["*"],
                    allowOrigins: ["*"],
                };
                const cors = url.cors === false
                    ? undefined
                    : url.cors === true || url.cors === undefined
                        ? defaultCors
                        : {
                            ...defaultCors,
                            ...url.cors,
                            maxAge: url.cors.maxAge && toSeconds(url.cors.maxAge),
                        };
                return {
                    authorization,
                    cors,
                    route: normalizeRouteArgs(url.router, url.route),
                };
            });
        }
        function normalizeCopyFiles() {
            return output(args.copyFiles ?? []).apply((copyFiles) => Promise.all(copyFiles.map(async (entry) => {
                const from = path.join($cli.paths.root, entry.from);
                const to = entry.to || entry.from;
                if (path.isAbsolute(to)) {
                    throw new VisibleError(`Copy destination path "${to}" must be relative`);
                }
                const stats = await fs.promises.stat(from);
                const isDir = stats.isDirectory();
                return { from, to, isDir };
            })));
        }
        function normalizeVpc() {
            // "vpc" is undefined
            if (!args.vpc)
                return;
            // "vpc" is a Vpc component
            if (args.vpc instanceof Vpc) {
                const result = {
                    privateSubnets: args.vpc.privateSubnets,
                    securityGroups: args.vpc.securityGroups,
                };
                return all([
                    args.vpc.id,
                    args.vpc.nodes.natGateways,
                    args.vpc.nodes.natInstances,
                ]).apply(([id, natGateways, natInstances]) => {
                    if (natGateways.length === 0 && natInstances.length === 0) {
                        warnOnce(`\nWarning: One or more functions are deployed in the "${id}" VPC, which does not have a NAT gateway. As a result, these functions cannot access the internet. If your functions need internet access, enable it by setting the "nat" prop on the "Vpc" component.\n`);
                    }
                    return result;
                });
            }
            return output(args.vpc).apply((vpc) => {
                // "vpc" is object
                if (vpc.subnets) {
                    throw new VisibleError(`The "vpc.subnets" property has been renamed to "vpc.privateSubnets". Update your code to use "vpc.privateSubnets" instead.`);
                }
                return vpc;
            });
        }
        function buildLinkData() {
            return output(args.link || []).apply((links) => Link.build(links));
        }
        function buildLinkPermissions() {
            return Link.getInclude("aws.permission", args.link);
        }
        function buildHandler() {
            return all([runtime, dev, isContainer]).apply(async ([runtime, dev, isContainer]) => {
                if (dev) {
                    return {
                        handler: "bootstrap",
                        bundle: path.join($cli.paths.platform, "dist", "bridge"),
                    };
                }
                const buildResult = buildInput.apply(async (input) => {
                    const result = await rpc.call("Runtime.Build", { ...input, isContainer });
                    if (result.errors.length > 0) {
                        throw new Error(result.errors.join("\n"));
                    }
                    if (args.hook?.postbuild)
                        await args.hook.postbuild(result.out);
                    return result;
                });
                return {
                    handler: buildResult.handler,
                    bundle: buildResult.out,
                    sourcemaps: buildResult.sourcemaps,
                };
            });
        }
        function buildHandlerWrapper() {
            const ret = all([
                dev,
                bundle,
                handler0,
                linkData,
                streaming,
                injections,
                runtime,
            ]).apply(async ([dev, bundle, handler, linkData, streaming, injections, runtime,]) => {
                if (dev)
                    return { handler };
                if (!runtime.startsWith("nodejs")) {
                    return { handler };
                }
                const hasUserInjections = injections.length > 0;
                if (!hasUserInjections)
                    return { handler };
                const parsed = path.posix.parse(handler);
                const handlerDir = parsed.dir;
                const oldHandlerFileName = parsed.name;
                const oldHandlerFunction = parsed.ext.replace(/^\./, "");
                const newHandlerFileName = "server-index";
                const newHandlerFunction = "handler";
                // Validate handler file exists
                const newHandlerFileExt = [".js", ".mjs", ".cjs"].find((ext) => fs.existsSync(path.join(bundle, handlerDir, oldHandlerFileName + ext)));
                if (!newHandlerFileExt) {
                    throw new VisibleError(`Could not find handler file "${handler}" for function "${name}"`);
                }
                const split = injections.reduce((acc, item) => {
                    if (item.startsWith("outer:")) {
                        acc.outer.push(item.substring("outer:".length));
                        return acc;
                    }
                    acc.inner.push(item);
                    return acc;
                }, { outer: [], inner: [] });
                return {
                    handler: path.posix.join(handlerDir, `${newHandlerFileName}.${newHandlerFunction}`),
                    wrapper: {
                        name: path.posix.join(handlerDir, `${newHandlerFileName}.mjs`),
                        content: streaming
                            ? [
                                ...split.outer,
                                `export const ${newHandlerFunction} = awslambda.streamifyResponse(async (event, responseStream, context) => {`,
                                ...split.inner,
                                `  const { ${oldHandlerFunction}: rawHandler} = await import("./${oldHandlerFileName}${newHandlerFileExt}");`,
                                `  return rawHandler(event, responseStream, context);`,
                                `});`,
                            ].join("\n")
                            : [
                                ...split.outer,
                                `export const ${newHandlerFunction} = async (event, context) => {`,
                                ...split.inner,
                                `  const { ${oldHandlerFunction}: rawHandler} = await import("./${oldHandlerFileName}${newHandlerFileExt}");`,
                                `  return rawHandler(event, context);`,
                                `};`,
                            ].join("\n"),
                    },
                };
            });
            return {
                handler: ret.handler,
                wrapper: ret.wrapper,
            };
        }
        function createRole() {
            if (args.role) {
                return iam.Role.get(`${name}Role`, output(args.role).apply(parseRoleArn).roleName, {}, { parent });
            }
            const policy = all([args.permissions || [], linkPermissions, dev]).apply(([argsPermissions, linkPermissions, dev]) => iam.getPolicyDocumentOutput({
                statements: [
                    ...argsPermissions,
                    ...linkPermissions,
                    ...(dev
                        ? [
                            {
                                effect: "allow",
                                actions: ["appsync:*"],
                                resources: ["*"],
                            },
                            {
                                effect: "allow",
                                actions: ["s3:*"],
                                resources: [
                                    interpolate `arn:${partition}:s3:::${bootstrapData.asset}`,
                                    interpolate `arn:${partition}:s3:::${bootstrapData.asset}/*`,
                                ],
                            },
                        ]
                        : []),
                ].map((item) => ({
                    effect: (() => {
                        const effect = item.effect ?? "allow";
                        return effect.charAt(0).toUpperCase() + effect.slice(1);
                    })(),
                    actions: item.actions,
                    resources: item.resources,
                })),
            }));
            return new iam.Role(...transform(args.transform?.role, `${name}Role`, {
                assumeRolePolicy: !dev
                    ? iam.assumeRolePolicyForPrincipal({
                        Service: "lambda.amazonaws.com",
                    })
                    : iam.getPolicyDocumentOutput({
                        statements: [
                            {
                                actions: ["sts:AssumeRole"],
                                principals: [
                                    {
                                        type: "Service",
                                        identifiers: ["lambda.amazonaws.com"],
                                    },
                                    {
                                        type: "AWS",
                                        identifiers: [
                                            interpolate `arn:${partition}:iam::${getCallerIdentityOutput({}, opts).accountId}:root`,
                                        ],
                                    },
                                ],
                            },
                        ],
                    }).json,
                // if there are no statements, do not add an inline policy.
                // adding an inline policy with no statements will cause an error.
                inlinePolicies: policy.apply(({ statements }) => statements ? [{ name: "inline", policy: policy.json }] : []),
                managedPolicyArns: all([logging, policies]).apply(([logging, policies]) => [
                    ...policies,
                    ...(logging
                        ? [
                            interpolate `arn:${partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`,
                        ]
                        : []),
                    ...(vpc
                        ? [
                            interpolate `arn:${partition}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole`,
                        ]
                        : []),
                ]),
            }, { parent }));
        }
        function createImageAsset() {
            // The build artifact directory already exists, with all the user code and
            // config files. It also has the dockerfile, we need to now just build and push to
            // the container registry.
            return all([isContainer, dev, bundle]).apply(([isContainer, dev, bundle, // We need the bundle to be resolved because of implicit dockerfiles even though we don't use it here
            ]) => {
                if (!isContainer || dev)
                    return;
                const authToken = ecr.getAuthorizationTokenOutput({
                    registryId: bootstrapData.assetEcrRegistryId,
                });
                return new Image(`${name}Image`, {
                    tags: [$interpolate `${bootstrapData.assetEcrUrl}:latest`],
                    context: {
                        location: path.join($cli.paths.work, "artifacts", `${name}-src`),
                    },
                    cacheFrom: [
                        {
                            registry: {
                                ref: $interpolate `${bootstrapData.assetEcrUrl}:${name}-cache`,
                            },
                        },
                    ],
                    cacheTo: [
                        {
                            registry: {
                                ref: $interpolate `${bootstrapData.assetEcrUrl}:${name}-cache`,
                                imageManifest: true,
                                ociMediaTypes: true,
                                mode: "max",
                            },
                        },
                    ],
                    platforms: [
                        architecture.apply((v) => v === "arm64" ? "linux/arm64" : "linux/amd64"),
                    ],
                    push: true,
                    registries: [
                        authToken.apply((authToken) => ({
                            address: authToken.proxyEndpoint,
                            username: authToken.userName,
                            password: secret(authToken.password),
                        })),
                    ],
                }, { parent });
            });
        }
        function createZipAsset() {
            // Note: cannot point the bundle to the `.open-next/server-function`
            //       b/c the folder contains node_modules. And pnpm node_modules
            //       contains symlinks. Pulumi cannot zip symlinks correctly.
            //       We will zip the folder ourselves.
            return all([
                bundle,
                wrapper,
                sourcemaps,
                copyFiles,
                isContainer,
                logGroup.apply((l) => l?.arn),
                dev,
            ]).apply(async ([bundle, wrapper, sourcemaps, copyFiles, isContainer, logGroupArn, dev,]) => {
                if (isContainer)
                    return;
                const zipPath = path.resolve($cli.paths.work, "artifacts", name, "code.zip");
                await fs.promises.mkdir(path.dirname(zipPath), {
                    recursive: true,
                });
                await new Promise(async (resolve, reject) => {
                    const ws = fs.createWriteStream(zipPath);
                    const archive = archiver("zip", {
                        // Ensure deterministic zip file hashes
                        // https://github.com/archiverjs/node-archiver/issues/397#issuecomment-554327338
                        statConcurrency: 1,
                    });
                    archive.on("warning", reject);
                    archive.on("error", reject);
                    // archive has been finalized and the output file descriptor has closed, resolve promise
                    // this has to be done before calling `finalize` since the events may fire immediately after.
                    // see https://www.npmjs.com/package/archiver
                    ws.once("close", () => {
                        resolve(zipPath);
                    });
                    archive.pipe(ws);
                    const files = [];
                    for (const item of [
                        {
                            from: bundle,
                            to: ".",
                            isDir: true,
                        },
                        ...(!dev ? copyFiles : []),
                    ]) {
                        if (!item.isDir) {
                            files.push({
                                from: item.from,
                                to: item.to,
                            });
                        }
                        const found = await glob("**", {
                            cwd: item.from,
                            dot: true,
                            ignore: sourcemaps?.map((item) => path.relative(bundle, item)) || [],
                        });
                        files.push(...found.map((file) => ({
                            from: path.join(item.from, file),
                            to: path.join(item.to, file),
                        })));
                    }
                    files.sort((a, b) => a.to.localeCompare(b.to));
                    for (const file of files) {
                        archive.file(file.from, {
                            name: file.to,
                            date: new Date(0),
                        });
                    }
                    // Add handler wrapper into the zip
                    if (wrapper) {
                        archive.append(wrapper.content, {
                            name: wrapper.name,
                            date: new Date(0),
                        });
                    }
                    await archive.finalize();
                });
                // Calculate hash of the zip file
                const hash = crypto.createHash("sha256");
                hash.update(await fs.promises.readFile(zipPath, "utf-8"));
                const hashValue = hash.digest("hex");
                const assetBucket = region.apply((region) => bootstrap.forRegion(region).then((d) => d.asset));
                if (logGroupArn && sourcemaps) {
                    let index = 0;
                    for (const file of sourcemaps) {
                        new s3.BucketObjectv2(`${name}Sourcemap${index}`, {
                            key: interpolate `sourcemap/${logGroupArn}/${hashValue}.${path.basename(file)}`,
                            bucket: assetBucket,
                            source: new asset.FileAsset(file),
                        }, { parent, retainOnDelete: true });
                        index++;
                    }
                }
                return new s3.BucketObjectv2(`${name}Code`, {
                    key: interpolate `assets/${name}-code-${hashValue}.zip`,
                    bucket: assetBucket,
                    source: new asset.FileArchive(zipPath),
                }, { parent });
            });
        }
        function createLogGroup() {
            return logging.apply((logging) => {
                if (!logging)
                    return;
                if (logging.logGroup)
                    return;
                return new cloudwatch.LogGroup(...transform(args.transform?.logGroup, `${name}LogGroup`, {
                    name: interpolate `/aws/lambda/${args.name ?? physicalName(64, `${name}Function`)}`,
                    retentionInDays: RETENTION[logging.retention],
                }, { parent, ignoreChanges: ["name"] }));
            });
        }
        function createFunction() {
            return all([
                logging,
                logGroup,
                isContainer,
                imageAsset,
                zipAsset,
                args.concurrency,
                dev,
            ]).apply(([logging, logGroup, isContainer, imageAsset, zipAsset, concurrency, dev,]) => {
                // This is a hack to avoid handler being marked as having propertyDependencies.
                // There is an unresolved bug in pulumi that causes issues when it does
                // @ts-expect-error
                handler.allResources = () => Promise.resolve(new Set());
                const transformed = transform(args.transform?.function, `${name}Function`, {
                    name: args.name,
                    description: args.description ?? "",
                    role: args.role ?? role.arn,
                    timeout: timeout.apply((timeout) => toSeconds(timeout)),
                    memorySize: memory.apply((memory) => toMBs(memory)),
                    ephemeralStorage: { size: storage.apply((v) => toMBs(v)) },
                    environment: {
                        variables: environment,
                    },
                    architectures: [architecture],
                    loggingConfig: logging && {
                        logFormat: logging.format === "json" ? "JSON" : "Text",
                        logGroup: logging.logGroup ?? logGroup.name,
                    },
                    vpcConfig: vpc && {
                        securityGroupIds: vpc.securityGroups,
                        subnetIds: vpc.privateSubnets,
                    },
                    fileSystemConfig: volume && {
                        arn: volume.efs,
                        localMountPath: volume.path,
                    },
                    layers: args.layers,
                    tags: args.tags,
                    publish: output(args.versioning).apply((v) => v ?? false),
                    reservedConcurrentExecutions: concurrency?.reserved,
                    ...(isContainer
                        ? {
                            packageType: "Image",
                            imageUri: imageAsset.ref.apply((ref) => ref?.replace(":latest", "")),
                            imageConfig: {
                                commands: [
                                    all([handler, runtime]).apply(([handler, runtime]) => {
                                        // If a python container image we have to rewrite the handler path so lambdaric is happy
                                        // This means no leading . and replace all / with .
                                        if (isContainer && runtime.includes("python")) {
                                            return handler
                                                .replace(/\.\//g, "")
                                                .replace(/\//g, ".");
                                        }
                                        return handler;
                                    }),
                                ],
                            },
                        }
                        : {
                            packageType: "Zip",
                            s3Bucket: zipAsset.bucket,
                            s3Key: zipAsset.key,
                            handler: unsecret(handler),
                            runtime: runtime.apply((v) => v === "go" || v === "rust" ? "provided.al2023" : v),
                        }),
                }, { parent });
                return new lambda.Function(transformed[0], {
                    ...transformed[1],
                    ...(dev
                        ? {
                            description: transformed[1].description
                                ? output(transformed[1].description).apply((v) => `${v.substring(0, 240)} (live)`)
                                : "live",
                            runtime: "provided.al2023",
                            architectures: ["x86_64"],
                        }
                        : {}),
                }, transformed[2]);
            });
        }
        function createUrl() {
            return url.apply((url) => {
                if (url === undefined)
                    return output(undefined);
                // create the function url
                const fnUrl = new lambda.FunctionUrl(`${name}Url`, {
                    functionName: fn.name,
                    authorizationType: url.authorization === "iam" ? "AWS_IAM" : "NONE",
                    invokeMode: streaming.apply((streaming) => streaming ? "RESPONSE_STREAM" : "BUFFERED"),
                    cors: url.cors,
                }, { parent });
                if (!url.route)
                    return fnUrl.functionUrl;
                // add router route
                const routeNamespace = crypto
                    .createHash("md5")
                    .update(`${$app.name}-${$app.stage}-${name}`)
                    .digest("hex")
                    .substring(0, 4);
                new KvKeys(`${name}RouteKey`, {
                    store: url.route.routerKvStoreArn,
                    namespace: routeNamespace,
                    entries: fnUrl.functionUrl.apply((fnUrl) => ({
                        metadata: JSON.stringify({
                            host: new URL(fnUrl).host,
                        }),
                    })),
                    purge: false,
                }, { parent });
                new KvRoutesUpdate(`${name}RoutesUpdate`, {
                    store: url.route.routerKvStoreArn,
                    namespace: url.route.routerKvNamespace,
                    key: "routes",
                    entry: url.route.apply((route) => ["url", routeNamespace, route.hostPattern, route.pathPrefix].join(",")),
                }, { parent });
                return url.route.routerUrl;
            });
        }
        function createProvisioned() {
            return all([args.concurrency, fn.publish]).apply(([concurrency, publish]) => {
                if (!concurrency?.provisioned || concurrency.provisioned === 0) {
                    return;
                }
                if (publish !== true) {
                    throw new VisibleError(`Provisioned concurrency requires function versioning. Set "versioning: true" to enable function versioning.`);
                }
                return new lambda.ProvisionedConcurrencyConfig(`${name}Provisioned`, {
                    functionName: fn.name,
                    qualifier: fn.version,
                    provisionedConcurrentExecutions: concurrency.provisioned,
                }, { parent });
            });
        }
        function createEventInvokeConfig() {
            if (args.retries === undefined) {
                return undefined;
            }
            return new lambda.FunctionEventInvokeConfig(...transform(args.transform?.eventInvokeConfig, `${name}EventInvokeConfig`, {
                functionName: fn.name,
                maximumRetryAttempts: args.retries,
            }, { parent }));
        }
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The IAM Role the function will use.
             */
            role: this.role,
            /**
             * The AWS Lambda function.
             */
            function: this.function,
            /**
             * The CloudWatch Log Group the function logs are stored.
             */
            logGroup: this.logGroup,
            /**
             * The Function Event Invoke Config resource if retries are configured.
             */
            eventInvokeConfig: this.eventInvokeConfig,
        };
    }
    /**
     * The Lambda function URL if `url` is enabled.
     */
    get url() {
        return this.urlEndpoint.apply((url) => {
            if (!url) {
                throw new VisibleError(`Function URL is not enabled. Enable it with "url: true".`);
            }
            return url;
        });
    }
    /**
     * The name of the Lambda function.
     */
    get name() {
        return this.function.name;
    }
    /**
     * The ARN of the Lambda function.
     */
    get arn() {
        return this.function.arn;
    }
    /**
     * Add environment variables lazily to the function after the function is created.
     *
     * This is useful for adding environment variables that are only available after the
     * function is created, like the function URL.
     *
     * @param environment The environment variables to add to the function.
     *
     * @example
     * Add the function URL as an environment variable.
     *
     * ```ts title="sst.config.ts"
     * const fn = new sst.aws.Function("MyFunction", {
     *   handler: "src/handler.handler",
     *   url: true,
     * });
     *
     * fn.addEnvironment({
     *   URL: fn.url,
     * });
     * ```
     */
    addEnvironment(environment) {
        return new FunctionEnvironmentUpdate(`${this.constructorName}EnvironmentUpdate`, {
            functionName: this.name,
            environment,
            region: getRegionOutput(undefined, { parent: this }).name,
        }, { parent: this });
    }
    /** @internal */
    static fromDefinition(name, definition, override, argsTransform, opts) {
        return output(definition).apply((definition) => {
            if (typeof definition === "string") {
                return new Function(...transform(argsTransform, name, { handler: definition, ...override }, opts || {}));
            }
            else if (definition.handler) {
                return new Function(...transform(argsTransform, name, {
                    ...definition,
                    ...override,
                    permissions: all([
                        definition.permissions,
                        override?.permissions,
                    ]).apply(([permissions, overridePermissions]) => [
                        ...(permissions ?? []),
                        ...(overridePermissions ?? []),
                    ]),
                }, opts || {}));
            }
            throw new Error(`Invalid function definition for the "${name}" Function`);
        });
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                name: this.name,
                url: this.urlEndpoint,
            },
            include: [
                permission({
                    actions: ["lambda:InvokeFunction"],
                    resources: [this.function.arn],
                }),
            ],
        };
    }
}
Function.encryptionKey = lazy(() => new RandomBytes("LambdaEncryptionKey", {
    length: 32,
}));
Function.appsync = lazy(() => rpc.call("Provider.Aws.Appsync", {}));
const __pulumiType = "sst:aws:Function";
// @ts-expect-error
Function.__pulumiType = __pulumiType;
