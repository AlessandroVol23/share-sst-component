import path from "path";
import fs from "fs";
import { output, all } from "@pulumi/pulumi";
import { Component, transform } from "../component.js";
import { VisibleError } from "../error.js";
import { buildApp } from "../base/base-ssr-site.js";
import { Worker } from "./worker.js";
export class SsrSite extends Component {
    constructor(type, name, args = {}, opts = {}) {
        super(type, name, args, opts);
        const self = this;
        const sitePath = normalizeSitePath();
        const outputPath = $dev ? sitePath : buildApp(self, name, args, sitePath);
        const plan = validatePlan(this.buildPlan(outputPath, name, args));
        const worker = createWorker();
        this.worker = worker;
        this.registerOutputs({
            _hint: $dev ? undefined : this.url,
            _dev: {
                command: "npm run dev",
                directory: sitePath,
                autostart: true,
            },
            _metadata: {
                mode: $dev ? "placeholder" : "deployed",
                path: sitePath,
            },
        });
        function normalizeSitePath() {
            return output(args.path).apply((sitePath) => {
                if (!sitePath)
                    return ".";
                if (!fs.existsSync(sitePath)) {
                    throw new VisibleError(`Site directory not found at "${path.resolve(sitePath)}". Please check the path setting in your configuration.`);
                }
                return sitePath;
            });
        }
        function validatePlan(plan) {
            return plan;
        }
        function createWorker() {
            return new Worker(...transform(args.transform?.server, `${name}Worker`, {
                handler: all([outputPath, plan.server]).apply(([outputPath, server]) => path.join(outputPath, server)),
                environment: args.environment,
                link: args.link,
                url: true,
                dev: false,
                domain: args.domain,
                assets: {
                    directory: all([outputPath, plan.assets]).apply(([outputPath, assets]) => path.join(outputPath, assets)),
                },
                largePayload: true,
            }, { parent: self }));
        }
    }
    /**
     * The URL of the Remix app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url() {
        return this.worker.url;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Cloudflare Worker that renders the site.
             */
            worker: this.worker,
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                url: this.url,
            },
        };
    }
}
