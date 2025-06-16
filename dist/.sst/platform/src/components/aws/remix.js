import fs from "fs";
import path from "path";
import { all } from "@pulumi/pulumi";
import { VisibleError } from "../error.js";
import { SsrSite } from "./ssr-site.js";
/**
 * The `Remix` component lets you deploy a [Remix](https://remix.run) app to AWS.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a Remix app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.Remix("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the Remix app in the `my-remix-app/` directory.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Remix("MyWeb", {
 *   path: "my-remix-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your Remix app.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Remix("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4} title="sst.config.ts"
 * new sst.aws.Remix("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your Remix app. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Remix("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your Remix app.
 *
 * ```ts title="app/root.tsx"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export class Remix extends SsrSite {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
    }
    normalizeBuildCommand() { }
    buildPlan(outputPath, _name, args) {
        return all([outputPath, args.buildDirectory]).apply(async ([outputPath, buildDirectory]) => {
            // The path for all files that need to be in the "/" directory (static assets)
            // is different when using Vite. These will be located in the "build/client"
            // path of the output by default. It will be the "public" folder when using remix config.
            let assetsPath = "public";
            let assetsVersionedSubDir = "build";
            let buildPath = path.join(outputPath, "build");
            const viteConfig = await loadViteConfig();
            if (viteConfig) {
                assetsPath = path.join(viteConfig.__remixPluginContext.remixConfig.buildDirectory, "client");
                assetsVersionedSubDir = "assets";
                buildPath = path.join(outputPath, viteConfig.__remixPluginContext.remixConfig.buildDirectory);
            }
            const basepath = fs
                .readFileSync(path.join(outputPath, "vite.config.ts"), "utf-8")
                .match(/base: ['"](.*)['"]/)?.[1];
            return {
                base: basepath,
                server: createServerLambdaBundle(),
                assets: [
                    {
                        from: assetsPath,
                        to: "",
                        cached: true,
                        versionedSubDir: assetsVersionedSubDir,
                    },
                ],
            };
            async function loadViteConfig() {
                const file = [
                    "vite.config.ts",
                    "vite.config.js",
                    "vite.config.mts",
                    "vite.config.mjs",
                ].find((filename) => fs.existsSync(path.join(outputPath, filename)));
                if (!file)
                    return;
                try {
                    const vite = await import("vite");
                    const config = await vite.loadConfigFromFile({ command: "build", mode: "production" }, path.join(outputPath, file));
                    if (!config)
                        throw new Error();
                    return {
                        __remixPluginContext: {
                            remixConfig: {
                                buildDirectory: buildDirectory ?? "build",
                            },
                        },
                    };
                }
                catch (e) {
                    throw new VisibleError(`Could not load Vite configuration from "${file}". Check that your Remix project uses Vite and the file exists.`);
                }
            }
            function createServerLambdaBundle() {
                // Create a Lambda@Edge handler for the Remix server bundle.
                //
                // Note: Remix does perform their own internal ESBuild process, but it
                // doesn't bundle 3rd party dependencies by default. In the interest of
                // keeping deployments seamless for users we will create a server bundle
                // with all dependencies included. We will still need to consider how to
                // address any need for external dependencies, although I think we should
                // possibly consider this at a later date.
                // In this path we are assuming that the Remix build only outputs the
                // "core server build". We can safely assume this as we have guarded the
                // remix.config.js to ensure it matches our expectations for the build
                // configuration.
                // We need to ensure that the "core server build" is wrapped with an
                // appropriate Lambda@Edge handler. We will utilise an internal asset
                // template to create this wrapper within the "core server build" output
                // directory.
                // Ensure build directory exists
                fs.mkdirSync(buildPath, { recursive: true });
                // Copy the server lambda handler and pre-append the build injection based
                // on the config file used.
                const content = [
                    // When using Vite config, the output build will be "server/index.js"
                    // and when using Remix config it will be `server.js`.
                    `// Import the server build that was produced by 'remix build'`,
                    viteConfig
                        ? `import * as remixServerBuild from "./server/index.js";`
                        : `import * as remixServerBuild from "./index.js";`,
                    ``,
                    fs.readFileSync(path.join($cli.paths.platform, "functions", "remix-server", "regional-server.mjs")),
                ].join("\n");
                fs.writeFileSync(path.join(buildPath, "server.mjs"), content);
                // Copy the Remix polyfil to the server build directory
                //
                // Note: We need to ensure that the polyfills are injected above other code that
                // will depend on them when not using Vite. Importing them within the top of the
                // lambda code doesn't appear to guarantee this, we therefore leverage ESBUild's
                // `inject` option to ensure that the polyfills are injected at the top of
                // the bundle.
                const polyfillDest = path.join(buildPath, "polyfill.mjs");
                fs.copyFileSync(path.join($cli.paths.platform, "functions", "remix-server", "polyfill.mjs"), polyfillDest);
                return {
                    handler: path.join(buildPath, "server.handler"),
                    nodejs: {
                        esbuild: {
                            inject: [path.resolve(polyfillDest)],
                        },
                    },
                    streaming: true,
                };
            }
        });
    }
    /**
     * The URL of the Remix app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url() {
        return super.url;
    }
}
const __pulumiType = "sst:aws:Remix";
// @ts-expect-error
Remix.__pulumiType = __pulumiType;
