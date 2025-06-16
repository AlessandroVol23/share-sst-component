import { rpc } from "../../rpc/rpc";
export const bootstrap = {
    forRegion(region) {
        return rpc.call("Provider.Aws.Bootstrap", { region });
    },
};
