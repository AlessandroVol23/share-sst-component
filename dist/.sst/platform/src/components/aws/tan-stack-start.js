import fs from "fs";
import path from "path";
import { VisibleError } from "../error.js";
import { SsrSite } from "./ssr-site.js";
/**
 * The `TanStackStart` component lets you deploy a [TanStack Start](https://tanstack.com/start/latest) app to AWS.
 *
 * :::note
 * You need to make sure the `server.preset` value in the `app.config.ts` is set to `aws-lambda`.
 * :::
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a TanStack Start app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the TanStack Start app in the `my-app/` directory.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb", {
 *   path: "my-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your TanStack Start app.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4} title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your TanStack Start app. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.TanStackStart("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your TanStack Start app.
 *
 * ```ts title="src/app.tsx"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export class TanStackStart extends SsrSite {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
    }
    normalizeBuildCommand() { }
    buildPlan(outputPath) {
        return outputPath.apply((outputPath) => {
            const nitro = JSON.parse(fs.readFileSync(path.join(outputPath, ".output", "nitro.json"), "utf-8"));
            if (!["aws-lambda"].includes(nitro.preset)) {
                throw new VisibleError(`TanStackStart's app.config.ts must be configured to use the "aws-lambda" preset. It is currently set to "${nitro.preset}".`);
            }
            const serverOutputPath = path.join(outputPath, ".output", "server");
            // If basepath is configured, nitro.mjs will have a line that looks like this:
            // return createRouter$2({ routeTree: Nr, defaultPreload: "intent", defaultErrorComponent: ce, defaultNotFoundComponent: () => jsx(de, {}), scrollRestoration: true, basepath: "/tan" });
            let basepath;
            // TanStack Start currently doesn't support basepaths.
            //try {
            //  const serverNitroChunk = fs.readFileSync(
            //    path.join(serverOutputPath, "chunks", "nitro", "nitro.mjs"),
            //    "utf-8",
            //  );
            //  basepath = serverNitroChunk.match(/basepath: "(.*)"/)?.[1];
            //} catch (e) {}
            // Remove the .output/public/_server directory from the assets
            // b/c all `_server` requests should go to the server function. If this folder is
            // not removed, it will create an s3 route that conflicts with the `_server` route.
            fs.rmSync(path.join(outputPath, ".output", "public", "_server"), {
                recursive: true,
                force: true,
            });
            fs.rmSync(path.join(outputPath, ".output", "public", "api"), {
                recursive: true,
                force: true,
            });
            return {
                base: basepath,
                server: {
                    description: "Server handler for TanStack",
                    handler: "index.handler",
                    bundle: serverOutputPath,
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
     * The URL of the TanStack Start app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url() {
        return super.url;
    }
}
const __pulumiType = "sst:aws:TanstackStart";
// @ts-expect-error
TanStackStart.__pulumiType = __pulumiType;
