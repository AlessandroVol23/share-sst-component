import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { RouterBaseRouteArgs } from "./router-base-route";
import { Bucket } from "./bucket";
import { RouterBucketRouteArgs } from "./router";
export interface Args extends RouterBaseRouteArgs {
    /**
     * The bucket to route to.
     */
    bucket: Input<Bucket>;
    /**
     * Additional arguments for the route.
     */
    routeArgs?: Input<RouterBucketRouteArgs>;
}
/**
 * The `RouterBucketRoute` component is internally used by the `Router` component
 * to add routes.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `routeBucket` method of the `Router` component.
 */
export declare class RouterBucketRoute extends Component {
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
}
