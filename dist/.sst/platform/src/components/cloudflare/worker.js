import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { output, all, jsonStringify, interpolate, } from "@pulumi/pulumi";
import * as cf from "@pulumi/cloudflare";
import { Component, transform } from "../component";
import { WorkerUrl } from "./providers/worker-url.js";
import { Link } from "../link.js";
import { ZoneLookup } from "./providers/zone-lookup.js";
import { iam } from "@pulumi/aws";
import { binding } from "./binding.js";
import { DEFAULT_ACCOUNT_ID } from "./account-id.js";
import { rpc } from "../rpc/rpc.js";
import { WorkerAssets } from "./providers/worker-assets";
import { WorkerScript } from "./providers/worker-script";
import { globSync } from "glob";
import { VisibleError } from "../error";
import { getContentType } from "../base/base-site";
import { physicalName } from "../naming";
import { existsAsync } from "../../util/fs";
/**
 * The `Worker` component lets you create a Cloudflare Worker.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler"
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to the Worker. This will handle the credentials
 * and allow you to access it in your handler.
 *
 * ```ts {5} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler",
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your handler.
 *
 * ```ts title="src/worker.ts" {3}
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 *
 * #### Enable URLs
 *
 * Enable worker URLs to invoke the worker over HTTP.
 *
 * ```ts {3} title="sst.config.ts"
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler",
 *   url: true
 * });
 * ```
 *
 * #### Bundling
 *
 * Customize how SST uses [esbuild](https://esbuild.github.io/) to bundle your worker code with the `build` property.
 *
 * ```ts title="sst.config.ts" {3-5}
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler",
 *   build: {
 *     install: ["pg"]
 *   }
 * });
 * ```
 */
export class Worker extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const parent = this;
        const dev = normalizeDev();
        const urlEnabled = normalizeUrl();
        const bindings = buildBindings();
        const iamCredentials = createAwsCredentials();
        const buildInput = all([name, args.handler, args.build, dev]).apply(async ([name, handler, build]) => {
            return {
                functionID: name,
                links: {},
                handler,
                runtime: "worker",
                properties: {
                    accountID: DEFAULT_ACCOUNT_ID,
                    build,
                },
            };
        });
        const build = buildHandler();
        const assets = uploadAssets();
        const script = args.largePayload ? createCustomScript() : createScript();
        const workerUrl = createWorkersUrl();
        const workerDomain = createWorkersDomain();
        this.script = script;
        this.workerUrl = workerUrl;
        this.workerDomain = workerDomain;
        all([dev, buildInput, script.scriptName]).apply(async ([dev, buildInput, scriptName]) => {
            if (!dev)
                return undefined;
            await rpc.call("Runtime.AddTarget", {
                ...buildInput,
                properties: {
                    ...buildInput.properties,
                    scriptName,
                },
            });
        });
        this.registerOutputs({
            _live: all([name, args.handler, args.build, dev]).apply(([name, handler, build, dev]) => {
                if (!dev)
                    return undefined;
                return {
                    functionID: name,
                    links: [],
                    handler,
                    runtime: "worker",
                    properties: {
                        accountID: DEFAULT_ACCOUNT_ID,
                        scriptName: script.scriptName,
                        build,
                    },
                };
            }),
            _metadata: {
                handler: args.handler,
            },
        });
        function normalizeDev() {
            return output(args.dev).apply((v) => $dev && v !== false);
        }
        function normalizeUrl() {
            return output(args.url).apply((v) => v ?? false);
        }
        function buildBindings() {
            const result = [
                {
                    type: "plain_text",
                    name: "SST_RESOURCE_App",
                    text: jsonStringify({
                        name: $app.name,
                        stage: $app.stage,
                    }),
                },
            ];
            if (!args.link)
                return result;
            return output(args.link).apply((links) => {
                for (let link of links) {
                    if (!Link.isLinkable(link))
                        continue;
                    const name = output(link.urn).apply((uri) => uri.split("::").at(-1));
                    const item = link.getSSTLink();
                    const b = item.include?.find((i) => i.type === "cloudflare.binding");
                    result.push(b
                        ? {
                            type: {
                                plainTextBindings: "plain_text",
                                secretTextBindings: "secret_text",
                                queueBindings: "queue",
                                serviceBindings: "service",
                                kvNamespaceBindings: "kv_namespace",
                                d1DatabaseBindings: "d1",
                                r2BucketBindings: "r2_bucket",
                            }[b.binding],
                            name,
                            ...b.properties,
                        }
                        : {
                            type: "secret_text",
                            name: name,
                            text: jsonStringify(item.properties),
                        });
                }
                return result;
            });
        }
        function createAwsCredentials() {
            return output(Link.getInclude("aws.permission", args.link)).apply((permissions) => {
                if (permissions.length === 0)
                    return;
                const user = new iam.User(`${name}AwsUser`, { forceDestroy: true }, { parent });
                new iam.UserPolicy(`${name}AwsPolicy`, {
                    user: user.name,
                    policy: jsonStringify({
                        Statement: permissions.map((p) => ({
                            Effect: (() => {
                                const effect = p.effect ?? "allow";
                                return effect.charAt(0).toUpperCase() + effect.slice(1);
                            })(),
                            Action: p.actions,
                            Resource: p.resources,
                        })),
                    }),
                }, { parent });
                const keys = new iam.AccessKey(`${name}AwsCredentials`, { user: user.name }, { parent });
                return keys;
            });
        }
        function buildHandler() {
            const buildResult = buildInput.apply(async (input) => {
                const result = await rpc.call("Runtime.Build", input);
                if (result.errors.length > 0) {
                    throw new Error(result.errors.join("\n"));
                }
                return result;
            });
            return buildResult;
        }
        function generateScriptName() {
            return physicalName(64, `${name}Script`).toLowerCase();
        }
        function uploadAssets() {
            if (!args.assets)
                return;
            // Build asset manifest
            const MAX_ASSET_COUNT = 20000;
            const MAX_ASSET_MB_SIZE = 25;
            const MAX_ASSET_BYTE_SIZE = MAX_ASSET_MB_SIZE * 1024 * 1024;
            const directory = output(args.assets).directory.apply((v) => path.resolve($cli.paths.root, v));
            return new WorkerAssets(`${name}Assets`, {
                scriptName: generateScriptName(),
                directory,
                manifest: directory.apply(async (dir) => {
                    // Parse .assetsignore file
                    const ignorePatterns = [".assetsignore"];
                    const ignorePath = path.join(dir, ".assetsignore");
                    if (await existsAsync(ignorePath)) {
                        const content = await fs.readFile(ignorePath, "utf-8");
                        const lines = content
                            .split("\n")
                            .filter((line) => line.trim() !== "");
                        ignorePatterns.push(...lines);
                    }
                    const files = globSync("**", {
                        cwd: dir,
                        nodir: true,
                        dot: true,
                        ignore: ignorePatterns,
                    });
                    if (files.length >= MAX_ASSET_COUNT) {
                        throw new VisibleError(`Maximum number of assets exceeded.\n` +
                            `Cloudflare Workers supports up to ${MAX_ASSET_COUNT} assets. We found ${files.length} files in the assets directory "${dir}".`);
                    }
                    const manifest = {};
                    await Promise.all(files.map(async (file) => {
                        const source = path.resolve(dir, file);
                        const [stat, content] = await Promise.all([
                            fs.stat(source),
                            fs.readFile(source, "utf-8"),
                        ]);
                        if (stat.size > MAX_ASSET_BYTE_SIZE) {
                            throw new VisibleError(`Asset too large.\n` +
                                `Cloudflare Workers supports assets with sizes of up to ${MAX_ASSET_MB_SIZE}mb (${MAX_ASSET_BYTE_SIZE} bytes). We found a file "${source}" with a size of ${stat.size} bytes.`);
                        }
                        manifest["/" + file.split(path.sep).join("/")] = {
                            hash: crypto.createHash("md5").update(content).digest("hex"),
                            size: stat.size,
                            contentType: getContentType(source, "UTF-8"),
                        };
                    }));
                    return manifest;
                }),
            }, { parent, ignoreChanges: ["scriptName"] });
        }
        function createScript() {
            return new cf.WorkersScript(...transform(args.transform?.worker, `${name}Script`, {
                scriptName: assets?.scriptName ?? generateScriptName(),
                mainModule: "placeholder",
                accountId: DEFAULT_ACCOUNT_ID,
                content: build.apply(async (build) => (await fs.readFile(path.join(build.out, build.handler))).toString()),
                compatibilityDate: "2025-05-05",
                compatibilityFlags: ["nodejs_compat"],
                assets: assets ? { jwt: assets.jwt } : undefined,
                bindings: all([args.environment, iamCredentials, bindings]).apply(([environment, iamCredentials, bindings]) => [
                    ...bindings,
                    ...(iamCredentials
                        ? [
                            {
                                type: "plain_text",
                                name: "AWS_ACCESS_KEY_ID",
                                text: iamCredentials.id,
                            },
                            {
                                type: "secret_text",
                                name: "AWS_SECRET_ACCESS_KEY",
                                text: iamCredentials.secret,
                            },
                        ]
                        : []),
                    ...(args.assets
                        ? [
                            {
                                type: "assets",
                                name: "ASSETS",
                            },
                        ]
                        : []),
                    ...Object.entries(environment ?? {}).map(([key, value]) => ({
                        type: "plain_text",
                        name: key,
                        text: value,
                    })),
                ]),
            }, { parent, ignoreChanges: ["scriptName"] }));
        }
        function createCustomScript() {
            const script = new WorkerScript(...transform(args.transform?.worker, `${name}CustomScript`, {
                scriptName: assets?.scriptName ?? generateScriptName(),
                mainModule: "placeholder",
                accountId: DEFAULT_ACCOUNT_ID,
                content: build.apply(async (build) => {
                    const filename = path.join(build.out, build.handler);
                    const content = await fs.readFile(filename, "utf-8");
                    return {
                        filename,
                        hash: crypto.createHash("md5").update(content).digest("hex"),
                    };
                }),
                compatibilityDate: "2025-05-05",
                compatibilityFlags: ["nodejs_compat"],
                assets: assets ? { jwt: assets.jwt } : undefined,
                bindings: all([args.environment, iamCredentials, bindings]).apply(([environment, iamCredentials, bindings]) => [
                    ...bindings,
                    ...(iamCredentials
                        ? [
                            {
                                type: "plain_text",
                                name: "AWS_ACCESS_KEY_ID",
                                text: iamCredentials.id,
                            },
                            {
                                type: "secret_text",
                                name: "AWS_SECRET_ACCESS_KEY",
                                text: iamCredentials.secret,
                            },
                        ]
                        : []),
                    ...(args.assets
                        ? [
                            {
                                type: "assets",
                                name: "ASSETS",
                            },
                        ]
                        : []),
                    ...Object.entries(environment ?? {}).map(([key, value]) => ({
                        type: "plain_text",
                        name: key,
                        text: value,
                    })),
                ]),
            }, { parent, ignoreChanges: ["scriptName"] }));
            return script;
        }
        function createWorkersUrl() {
            return new WorkerUrl(`${name}Url`, {
                accountId: DEFAULT_ACCOUNT_ID,
                scriptName: script.scriptName,
                enabled: urlEnabled,
            }, { parent });
        }
        function createWorkersDomain() {
            if (!args.domain)
                return;
            const zone = new ZoneLookup(`${name}ZoneLookup`, {
                accountId: DEFAULT_ACCOUNT_ID,
                domain: args.domain,
            }, { parent });
            return new cf.WorkersCustomDomain(`${name}Domain`, {
                accountId: DEFAULT_ACCOUNT_ID,
                service: script.scriptName,
                hostname: args.domain,
                zoneId: zone.id,
                environment: "production",
            }, { parent });
        }
    }
    /**
     * The Worker URL if `url` is enabled.
     */
    get url() {
        return this.workerDomain
            ? interpolate `https://${this.workerDomain.hostname}`
            : this.workerUrl.url.apply((url) => (url ? `https://${url}` : url));
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Cloudflare Worker script.
             */
            worker: this.script,
        };
    }
    /**
     * When you link a worker, say WorkerA, to another worker, WorkerB; it automatically creates
     * a service binding between the workers. It allows WorkerA to call WorkerB without going
     * through a publicly-accessible URL.
     *
     * @example
     * ```ts title="index.ts" {3}
     * import { Resource } from "sst";
     *
     * await Resource.WorkerB.fetch(request);
     * ```
     *
     * Read more about [binding Workers](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/).
     *
     * @internal
     */
    getSSTLink() {
        return {
            properties: {
                url: this.url,
            },
            include: [
                binding({
                    type: "serviceBindings",
                    properties: {
                        service: this.script.id,
                    },
                }),
            ],
        };
    }
}
const __pulumiType = "sst:cloudflare:Worker";
// @ts-expect-error
Worker.__pulumiType = __pulumiType;
