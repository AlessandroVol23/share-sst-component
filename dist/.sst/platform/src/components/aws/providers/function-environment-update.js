import { dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";
/**
 * The `FunctionEnvironmentUpdate` component is internally used by the `Function` component
 * to update the environment variables of a function.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `addEnvironment` method of the `Function` component.
 */
export class FunctionEnvironmentUpdate extends dynamic.Resource {
    constructor(name, args, opts) {
        super(new rpc.Provider("Aws.FunctionEnvironmentUpdate"), `${name}.sst.aws.FunctionEnvironmentUpdate`, args, opts);
    }
}
