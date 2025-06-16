import fs from "fs";
import path from "path";
import { VisibleError } from "../error.js";
import { SsrSite } from "./ssr-site.js";
/**
 * The `Analog` component lets you deploy a [Analog](https://analogjs.org) app to AWS.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy an Analog app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.Analog("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the Analog app in the `my-analog-app/` directory.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Analog("MyWeb", {
 *   path: "my-analog-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your Analog app.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Analog("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4} title="sst.config.ts"
 * new sst.aws.Analog("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your Analog app. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Analog("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your Analog app.
 *
 * ```ts title="src/app/app.config.ts"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export class Analog extends SsrSite {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
    }
    normalizeBuildCommand() { }
    buildPlan(outputPath) {
        return outputPath.apply((outputPath) => {
            const nitro = JSON.parse(fs.readFileSync(path.join(outputPath, "dist", "analog", "nitro.json"), "utf-8"));
            if (!["aws-lambda"].includes(nitro.preset)) {
                throw new VisibleError(`Analog's vite.config.ts must be configured to use the "aws-lambda" preset. It is currently set to "${nitro.preset}".`);
            }
            const basepath = fs
                .readFileSync(path.join(outputPath, "vite.config.ts"), "utf-8")
                .match(/base: ['"](.*)['"]/)?.[1];
            return {
                base: basepath,
                server: {
                    description: "Server handler for Analog",
                    handler: "index.handler",
                    bundle: path.join(outputPath, "dist", "analog", "server"),
                },
                assets: [
                    {
                        from: path.join("dist", "analog", "public"),
                        to: "",
                        cached: true,
                    },
                ],
            };
        });
    }
    /**
     * The URL of the Analog app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url() {
        return super.url;
    }
}
const __pulumiType = "sst:aws:Analog";
// @ts-expect-error
Analog.__pulumiType = __pulumiType;
