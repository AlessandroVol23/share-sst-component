import { ComponentResourceOptions } from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { Component, Transform } from "../component";
import { Link } from "../link";
export interface QueueArgs {
    /**
     * [Transform](/docs/components/#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Queue resource.
         */
        queue?: Transform<cloudflare.QueueArgs>;
    };
}
/**
 * The `Queue` component lets you add a [Cloudflare Queue](https://developers.cloudflare.com/queues/) to
 * your app.
 */
export declare class Queue extends Component implements Link.Linkable {
    private queue;
    constructor(name: string, args?: QueueArgs, opts?: ComponentResourceOptions);
    getSSTLink(): {
        properties: {};
        include: {
            type: "cloudflare.binding";
            binding: "kvNamespaceBindings" | "secretTextBindings" | "serviceBindings" | "plainTextBindings" | "queueBindings" | "r2BucketBindings" | "d1DatabaseBindings";
            properties: {
                namespaceId: import("../input").Input<string>;
            } | {
                text: import("../input").Input<string>;
            } | {
                service: import("../input").Input<string>;
            } | {
                text: import("../input").Input<string>;
            } | {
                queue: import("../input").Input<string>;
            } | {
                bucketName: import("../input").Input<string>;
            } | {
                id: import("../input").Input<string>;
            };
        }[];
    };
    /**
     * The generated id of the queue
     */
    get id(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Cloudflare queue.
         */
        queue: import("@pulumi/cloudflare/queue").Queue;
    };
}
