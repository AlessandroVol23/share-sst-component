import fs from "fs";
import path from "path";
import { SsrSite } from "./ssr-site.js";
/**
 * The `Nuxt` component lets you deploy a [Nuxt](https://nuxt.com) app to AWS.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a Nuxt app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.Nuxt("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the Nuxt app in the `my-nuxt-app/` directory.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Nuxt("MyWeb", {
 *   path: "my-nuxt-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your Nuxt app.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Nuxt("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4} title="sst.config.ts"
 * new sst.aws.Nuxt("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your Nuxt app. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Nuxt("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your Nuxt app.
 *
 * ```ts title="server/api/index.ts"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export class Nuxt extends SsrSite {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
    }
    normalizeBuildCommand() { }
    buildPlan(outputPath) {
        return outputPath.apply((outputPath) => {
            const basepath = fs
                .readFileSync(path.join(outputPath, "nuxt.config.ts"), "utf-8")
                .match(/baseURL: ['"](.*)['"]/)?.[1];
            return {
                base: basepath,
                server: {
                    description: "Server handler for Nuxt",
                    handler: "index.handler",
                    bundle: path.join(outputPath, ".output", "server"),
                },
                assets: [
                    {
                        from: path.join(".output", "public"),
                        to: "",
                        cached: true,
                    },
                ],
            };
        });
    }
    /**
     * The URL of the Nuxt app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url() {
        return super.url;
    }
}
const __pulumiType = "sst:aws:Nuxt";
// @ts-expect-error
Nuxt.__pulumiType = __pulumiType;
