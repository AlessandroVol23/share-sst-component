import { Output, Resource } from "@pulumi/pulumi";
import { Prettify } from "../component";
import { Input } from "../input";
import { BaseSiteDev } from "./base-site";
export interface BaseSsrSiteArgs {
    dev?: false | Prettify<BaseSiteDev>;
    buildCommand?: Input<string>;
    environment?: Input<Record<string, Input<string>>>;
    link?: Input<any[]>;
    path?: Input<string>;
}
export declare function buildApp(parent: Resource, name: string, args: BaseSsrSiteArgs, sitePath: Output<string>, buildCommand?: Output<string>): Output<string>;
