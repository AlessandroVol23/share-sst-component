import { runtime, output, all, ComponentResource, } from "@pulumi/pulumi";
import { VisibleError } from "./error.js";
import { Linkable } from "./linkable.js";
export var Link;
(function (Link) {
    class Ref extends ComponentResource {
        constructor(target, type, properties, include) {
            super("sst:sst:LinkRef", target + "LinkRef", {
                properties,
                include,
            }, {});
            this.registerOutputs({
                target: target,
                include,
                properties: {
                    type: type.replaceAll(":", "."),
                    ...properties,
                },
            });
        }
    }
    Link.Ref = Ref;
    function reset() {
        const links = new Set();
        // Ensure component names are unique
        runtime.registerStackTransformation((args) => {
            const isLinkable = args.type.startsWith("sst:") ||
                Linkable.wrappedResources.has(args.type);
            if (isLinkable && !args.opts.parent) {
                const lcname = args.name.toLowerCase();
                // "App" is reserved and cannot be used as a component name.
                if (lcname === "app") {
                    throw new VisibleError(`Component name "${args.name}" is reserved. Please choose a different name for your "${args.type}" component.`);
                }
                // Ensure linkable resources have unique names. This includes all SST components
                // and non-SST components that are linkable.
                if (links.has(lcname)) {
                    throw new VisibleError(`Component name ${args.name} is not unique.`);
                }
                links.add(lcname);
            }
            return {
                opts: args.opts,
                props: args.props,
            };
        });
        // Create link refs
        runtime.registerStackTransformation((args) => {
            const resource = args.resource;
            process.nextTick(() => {
                if (Link.isLinkable(resource) && !args.opts.parent) {
                    try {
                        const link = resource.getSSTLink();
                        new Ref(args.name, args.type, link.properties, link.include);
                    }
                    catch (e) { }
                }
            });
            return {
                opts: args.opts,
                props: args.props,
            };
        });
    }
    Link.reset = reset;
    function isLinkable(obj) {
        return "getSSTLink" in obj;
    }
    Link.isLinkable = isLinkable;
    function build(links) {
        return links
            .map((link) => {
            if (!link)
                throw new VisibleError("An undefined link was passed into a `link` array.");
            return link;
        })
            .filter((l) => isLinkable(l))
            .map((l) => {
            const link = l.getSSTLink();
            return all([l.urn, link]).apply(([urn, link]) => ({
                name: urn.split("::").at(-1),
                properties: {
                    ...link.properties,
                    type: urn.split("::").at(-2),
                },
            }));
        });
    }
    Link.build = build;
    function getProperties(links) {
        const linkProperties = output(links ?? []).apply((links) => links
            .map((link) => {
            if (!link)
                throw new VisibleError("An undefined link was passed into a `link` array.");
            return link;
        })
            .filter((l) => isLinkable(l))
            .map((l) => ({
            urn: l.urn,
            properties: l.getSSTLink().properties,
        })));
        return output(linkProperties).apply((e) => Object.fromEntries(e.map(({ urn, properties }) => {
            const name = urn.split("::").at(-1);
            const data = {
                ...properties,
                type: urn.split("::").at(-2),
            };
            return [name, data];
        })));
    }
    Link.getProperties = getProperties;
    function propertiesToEnv(properties) {
        return output(properties).apply((properties) => {
            const env = Object.fromEntries(Object.entries(properties).map(([key, value]) => {
                return [`SST_RESOURCE_${key}`, JSON.stringify(value)];
            }));
            env["SST_RESOURCE_App"] = JSON.stringify({
                name: $app.name,
                stage: $app.stage,
            });
            return env;
        });
    }
    Link.propertiesToEnv = propertiesToEnv;
    function getInclude(type, input) {
        if (!input)
            return output([]);
        return output(input).apply((links) => {
            return links.filter(isLinkable).flatMap((l) => {
                const link = l.getSSTLink();
                return (link.include || []).filter((i) => i.type === type);
            });
        });
    }
    Link.getInclude = getInclude;
    /** @deprecated
     * Use sst.Linkable.wrap instead.
     */
    function linkable(obj, cb) {
        console.warn("sst.linkable is deprecated. Use sst.Linkable.wrap instead.");
        obj.prototype.getSSTLink = function () {
            return cb(this);
        };
    }
    Link.linkable = linkable;
})(Link || (Link = {}));
