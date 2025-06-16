import { dynamic } from "@pulumi/pulumi";
export declare namespace rpc {
    class MethodNotFoundError extends Error {
        method: string;
        constructor(method: string);
    }
    function call<T = any>(method: string, args: any): Promise<T>;
    class Provider implements dynamic.ResourceProvider {
        private type;
        constructor(type: string);
        private name;
        create(inputs: any): Promise<dynamic.CreateResult<any>>;
        delete(id: string, outs: any): Promise<void>;
        update(id: string, olds: any, news: any): Promise<any>;
        read(id: string, props: any): Promise<dynamic.ReadResult>;
        diff(id: string, olds: any, news: any): Promise<dynamic.DiffResult>;
    }
}
