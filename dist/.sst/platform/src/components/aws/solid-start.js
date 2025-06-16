import fs from "fs";
import path from "path";
import { VisibleError } from "../error.js";
import { SsrSite } from "./ssr-site.js";
/**
 * The `SolidStart` component lets you deploy a [SolidStart](https://start.solidjs.com) app to AWS.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a SolidStart app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.SolidStart("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the SolidStart app in the `my-solid-app/` directory.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.SolidStart("MyWeb", {
 *   path: "my-solid-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your SolidStart app.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.SolidStart("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4} title="sst.config.ts"
 * new sst.aws.SolidStart("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your SolidStart app. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.SolidStart("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your SolidStart app.
 *
 * ```ts title="src/app.tsx"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export class SolidStart extends SsrSite {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
    }
    normalizeBuildCommand() { }
    buildPlan(outputPath) {
        return outputPath.apply((outputPath) => {
            // Make sure aws-lambda preset is used in nitro.json
            const nitro = JSON.parse(fs.readFileSync(path.join(outputPath, ".output", "nitro.json"), "utf-8"));
            if (!["aws-lambda"].includes(nitro.preset)) {
                throw new VisibleError(`SolidStart's app.config.ts must be configured to use the "aws-lambda" preset. It is currently set to "${nitro.preset}".`);
            }
            // Get base path
            const appConfig = fs.readFileSync(path.join(outputPath, "app.config.ts"), "utf-8");
            const basepath = appConfig.match(/baseURL: ['"](.*)['"]/)?.[1];
            return {
                base: basepath,
                server: {
                    description: "Server handler for Solid",
                    handler: "index.handler",
                    bundle: path.join(outputPath, ".output", "server"),
                    streaming: nitro?.config?.awsLambda?.streaming === true,
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
     * The URL of the SolidStart app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url() {
        return super.url;
    }
}
const __pulumiType = "sst:aws:SolidStart";
// @ts-expect-error
SolidStart.__pulumiType = __pulumiType;
