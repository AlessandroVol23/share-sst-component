import fs from "fs";
import path from "path";
import { output } from "@pulumi/pulumi";
import { SsrSite } from "./ssr-site.js";
/**
 * The `React` component lets you deploy a React app built with [React Router](https://reactrouter.com/) app to AWS.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a React app that's in the project root.
 *
 * ```js
 * new sst.aws.React("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the React app in the `my-react-app/` directory.
 *
 * ```js {2}
 * new sst.aws.React("MyWeb", {
 *   path: "my-react-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your React app.
 *
 * ```js {2}
 * new sst.aws.React("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4}
 * new sst.aws.React("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your React app. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4}
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.React("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your React app.
 *
 * ```ts title="app/root.tsx"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export class React extends SsrSite {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
    }
    normalizeBuildCommand() { }
    buildPlan(outputPath) {
        return output(outputPath).apply((outputPath) => {
            const assetsPath = path.join("build", "client");
            const serverPath = (() => {
                const p = path.join("build", "server");
                return fs.existsSync(path.join(outputPath, p)) ? p : undefined;
            })();
            const indexPage = "index.html";
            // Get base configured in vite config ie. "/docs/"
            const viteBase = (() => {
                try {
                    const viteConfig = path.join(outputPath, "vite.config.ts");
                    const content = fs.readFileSync(viteConfig, "utf-8");
                    const match = content.match(/["']?base["']?:\s*["']([^"]+)["']/);
                    return match ? match[1] : undefined;
                }
                catch (e) { }
            })();
            // Get base configured in react-router config ie. "/docs/"
            const reactRouterBase = (() => {
                try {
                    const rrConfig = path.join(outputPath, "react-router.config.ts");
                    const content = fs.readFileSync(rrConfig, "utf-8");
                    const match = content.match(/["']?basename["']?:\s*["']([^"]+)["']/);
                    return match ? match[1] : undefined;
                }
                catch (e) { }
            })();
            if (viteBase) {
                if (!viteBase.endsWith("/"))
                    throw new Error(`The "base" value in vite.config.ts must end with a trailing slash ("/"). This is required for correct asset path construction.`);
                if (!reactRouterBase)
                    throw new Error(`Found "base" configured in vite.config.ts but missing "basename" in react-router.config.ts. Both configurations are required.`);
            }
            if (reactRouterBase) {
                if (reactRouterBase.endsWith("/"))
                    throw new Error(`The "basename" value in react-router.config.ts must not end with a trailing slash ("/"). This ensures the root URL is accessible without a trailing slash.`);
                if (!viteBase)
                    throw new Error(`Found "basename" configured in react-router.config.ts but missing "base" in vite.config.ts. Both configurations are required.`);
            }
            return {
                base: reactRouterBase,
                server: serverPath
                    ? (() => {
                        // React does perform their own internal ESBuild process, but it doesn't bundle
                        // 3rd party dependencies by default. In the interest of keeping deployments
                        // seamless for users we will create a server bundle with all dependencies included.
                        fs.copyFileSync(path.join($cli.paths.platform, "functions", "react-server", "server.mjs"), path.join(outputPath, "build", "server.mjs"));
                        return {
                            handler: path.join(outputPath, "build", "server.handler"),
                            streaming: true,
                        };
                    })()
                    : undefined,
                assets: [
                    {
                        from: assetsPath,
                        to: "",
                        cached: true,
                        versionedSubDir: "assets",
                    },
                ],
                custom404: serverPath ? undefined : `/${indexPage}`,
            };
        });
    }
    /**
     * The URL of the React app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url() {
        return super.url;
    }
}
const __pulumiType = "sst:aws:React";
// @ts-expect-error
React.__pulumiType = __pulumiType;
