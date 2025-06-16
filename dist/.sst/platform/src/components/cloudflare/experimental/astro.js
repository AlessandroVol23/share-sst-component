import fs from "fs/promises";
import path from "path";
import { VisibleError } from "../../error.js";
import { SsrSite } from "../ssr-site.js";
import { existsAsync } from "../../../util/fs.js";
/**
 * The `Astro` component lets you deploy an [Astro](https://astro.build) site to Cloudflare.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy the Astro site that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.cloudflare.Astro("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the Astro site in the `my-astro-app/` directory.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.cloudflare.Astro("MyWeb", {
 *   path: "my-astro-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your Astro site.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.cloudflare.Astro("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your Astro site. This will grant permissions
 * to the resources and allow you to access it in your site.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.cloudflare.Bucket("MyBucket");
 *
 * new sst.cloudflare.Astro("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can access the linked resources as bindings in your Astro site.
 *
 * ```astro title="src/pages/index.astro"
 * ---
 * const { env } = Astro.locals.runtime;
 *
 * const files = await env.MyBucket.list();
 * ---
 * ```
 */
export class Astro extends SsrSite {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
    }
    buildPlan(outputPath) {
        return outputPath.apply(async (outputPath) => {
            const distPath = path.join(outputPath, "dist");
            if (!(await existsAsync(path.join(distPath, "_worker.js", "index.js")))) {
                throw new VisibleError(`SSR server bundle "_worker.js" not found in the build output at:\n` +
                    `  "${path.resolve(distPath)}".\n\n` +
                    `If your Astro project is entirely pre-rendered, use the \`sst.cloudflare.StaticSite\` component instead of \`sst.cloudflare.Astro\`.`);
            }
            // Ensure `.assetsignore` file exists and contains `_worker.js` and `_routes.json`
            const ignorePath = path.join(outputPath, "dist", ".assetsignore");
            const ignorePatterns = (await existsAsync(ignorePath))
                ? (await fs.readFile(ignorePath, "utf-8")).split("\n")
                : [];
            let dirty = false;
            ["_worker.js", "_routes.json"].forEach((pattern) => {
                if (ignorePatterns.includes(pattern))
                    return;
                ignorePatterns.push(pattern);
                dirty = true;
            });
            if (dirty) {
                await fs.appendFile(ignorePath, "\n_worker.js\n_routes.json");
            }
            return {
                server: "./dist/_worker.js/index.js",
                assets: "./dist",
            };
        });
    }
    /**
     * The URL of the Astro site.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated Worker URL.
     */
    get url() {
        return super.url;
    }
}
const __pulumiType = "sst:cloudflare:Astro";
// @ts-expect-error
Astro.__pulumiType = __pulumiType;
