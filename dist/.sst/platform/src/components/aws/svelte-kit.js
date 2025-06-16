import fs from "fs";
import path from "path";
import { SsrSite } from "./ssr-site.js";
/**
 * The `SvelteKit` component lets you deploy a [SvelteKit](https://kit.svelte.dev/) app to AWS.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a SvelteKit app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.SvelteKit("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the SvelteKit app in the `my-svelte-app/` directory.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.SvelteKit("MyWeb", {
 *   path: "my-svelte-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your SvelteKit app.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.SvelteKit("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4} title="sst.config.ts"
 * new sst.aws.SvelteKit("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your SvelteKit app. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.SvelteKit("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your SvelteKit app.
 *
 * ```ts title="src/routes/+page.server.ts"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export class SvelteKit extends SsrSite {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
    }
    normalizeBuildCommand() { }
    buildPlan(outputPath) {
        return outputPath.apply((outputPath) => {
            const serverOutputPath = path.join(outputPath, ".svelte-kit", "svelte-kit-sst", "server");
            let basepath;
            try {
                const manifest = fs
                    .readFileSync(path.join(serverOutputPath, "manifest.js"))
                    .toString();
                const appDir = manifest.match(/appDir: "(.+?)"/)?.[1];
                const appPath = manifest.match(/appPath: "(.+?)"/)?.[1];
                if (appDir && appPath && appPath.endsWith(appDir)) {
                    basepath = appPath.substring(0, appPath.length - appDir.length);
                }
            }
            catch (e) { }
            return {
                base: basepath,
                server: {
                    handler: path.join(serverOutputPath, "lambda-handler", "index.handler"),
                    nodejs: {
                        esbuild: {
                            minify: process.env.SST_DEBUG ? false : true,
                            sourcemap: process.env.SST_DEBUG ? "inline" : false,
                            define: {
                                "process.env.SST_DEBUG": process.env.SST_DEBUG
                                    ? "true"
                                    : "false",
                            },
                        },
                    },
                    copyFiles: [
                        {
                            from: path.join(outputPath, ".svelte-kit", "svelte-kit-sst", "prerendered"),
                            to: "prerendered",
                        },
                    ],
                },
                assets: [
                    {
                        from: path.join(".svelte-kit", "svelte-kit-sst", "client"),
                        to: "",
                        cached: true,
                        versionedSubDir: "_app",
                    },
                    {
                        from: path.join(".svelte-kit", "svelte-kit-sst", "prerendered"),
                        to: "",
                        cached: false,
                    },
                ],
            };
        });
    }
    /**
     * The URL of the SvelteKit app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url() {
        return super.url;
    }
}
const __pulumiType = "sst:aws:SvelteKit";
// @ts-expect-error
SvelteKit.__pulumiType = __pulumiType;
