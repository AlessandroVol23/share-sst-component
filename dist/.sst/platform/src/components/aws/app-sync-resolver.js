import { output } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { VisibleError } from "../error";
import { appsync } from "@pulumi/aws";
/**
 * The `AppSyncResolver` component is internally used by the `AppSync` component to add
 * resolvers to [AWS AppSync](https://docs.aws.amazon.com/appsync/latest/devguide/what-is-appsync.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `addResolver` method of the `AppSync` component.
 */
export class AppSyncResolver extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const self = this;
        const kind = normalizeKind();
        const resolver = createResolver();
        this.resolver = resolver;
        function normalizeKind() {
            return output(args.kind ?? "unit").apply((kind) => {
                if (kind === "unit" && args.functions)
                    throw new VisibleError("The `functions` property is not supported for `unit` resolvers.");
                if (kind === "pipeline" && args.dataSource)
                    throw new VisibleError("The `dataSource` property is not supported for `pipeline` resolvers.");
                return kind;
            });
        }
        function createResolver() {
            return new appsync.Resolver(...transform(args.transform?.resolver, `${name}Resolver`, {
                apiId: args.apiId,
                kind: kind.apply((kind) => kind.toUpperCase()),
                type: args.type,
                field: args.field,
                dataSource: args.dataSource,
                requestTemplate: args.requestTemplate,
                responseTemplate: args.responseTemplate,
                code: args.code,
                runtime: args.code
                    ? {
                        name: "APPSYNC_JS",
                        runtimeVersion: "1.0.0",
                    }
                    : undefined,
                pipelineConfig: args.functions
                    ? { functions: args.functions }
                    : undefined,
            }, { parent: self }));
        }
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon AppSync Resolver.
             */
            resolver: this.resolver,
        };
    }
}
const __pulumiType = "sst:aws:AppSyncResolver";
// @ts-expect-error
AppSyncResolver.__pulumiType = __pulumiType;
