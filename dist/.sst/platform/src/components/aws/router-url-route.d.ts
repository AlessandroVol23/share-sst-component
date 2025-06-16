import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { RouterBaseRouteArgs } from "./router-base-route";
import { RouterUrlRouteArgs } from "./router";
export interface Args extends RouterBaseRouteArgs {
    /**
     * The URL to route to.
     */
    url: Input<string>;
    /**
     * Additional arguments for the route.
     */
    routeArgs?: Input<RouterUrlRouteArgs>;
}
/**
 * The `RouterUrlRoute` component is internally used by the `Router` component
 * to add routes.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `route` method of the `Router` component.
 */
export declare class RouterUrlRoute extends Component {
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
}
