import { Output, ComponentResourceOptions } from "@pulumi/pulumi";
import { Input } from "../input.js";
import { Component, type Transform } from "../component.js";
import { BaseSsrSiteArgs } from "../base/base-ssr-site.js";
import { Worker, WorkerArgs } from "./worker.js";
import { Link } from "../link.js";
export type Plan = {
    server: string;
    assets: string;
};
export interface SsrSiteArgs extends BaseSsrSiteArgs {
    domain?: Input<string>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Worker component used for handling the server-side rendering.
         */
        server?: Transform<WorkerArgs>;
    };
}
export declare abstract class SsrSite extends Component implements Link.Linkable {
    private worker;
    protected abstract buildPlan(outputPath: Output<string>, name: string, args: SsrSiteArgs): Output<Plan>;
    constructor(type: string, name: string, args?: SsrSiteArgs, opts?: ComponentResourceOptions);
    /**
     * The URL of the Remix app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url(): Output<string | undefined>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Cloudflare Worker that renders the site.
         */
        worker: Worker;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            url: Output<string | undefined>;
        };
    };
}
