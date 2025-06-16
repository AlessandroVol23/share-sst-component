import http from "http";
export var rpc;
(function (rpc) {
    class MethodNotFoundError extends Error {
        constructor(method) {
            super(`Method "${method}" not found`);
            this.method = method;
        }
    }
    rpc.MethodNotFoundError = MethodNotFoundError;
    async function call(method, args) {
        return new Promise((resolve, reject) => {
            const url = new URL(process.env.SST_SERVER + "/rpc");
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            };
            const req = http.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`Failed to call RPC: ${data}`));
                        return;
                    }
                    try {
                        const json = JSON.parse(data);
                        if (json.error) {
                            if (json.error.startsWith("rpc: can't find")) {
                                reject(new MethodNotFoundError(method));
                                return;
                            }
                            reject(new Error(json.error));
                            return;
                        }
                        resolve(json.result);
                    }
                    catch (error) {
                        reject(new Error(`Failed to parse JSON: ${error.message}`));
                    }
                });
            });
            req.on("error", (error) => {
                reject(error);
            });
            // Set timeout to 0 to prevent any timeout
            req.setTimeout(0);
            const body = JSON.stringify({
                jsonrpc: "1.0",
                method,
                params: [args],
            });
            req.write(body);
            req.end();
        });
    }
    rpc.call = call;
    class Provider {
        constructor(type) {
            this.type = type;
        }
        name(action) {
            return "Resource." + this.type + "." + action;
        }
        async create(inputs) {
            return call(this.name("Create"), inputs);
        }
        async delete(id, outs) {
            return call(this.name("Delete"), { id, outs }).catch((ex) => {
                if (ex instanceof MethodNotFoundError)
                    return;
                throw ex;
            });
        }
        async update(id, olds, news) {
            return call(this.name("Update"), { id, olds, news }).catch((ex) => {
                if (ex instanceof MethodNotFoundError)
                    return {
                        id,
                    };
                throw ex;
            });
        }
        async read(id, props) {
            return call(this.name("Read"), { id, props }).catch((ex) => {
                if (ex instanceof MethodNotFoundError)
                    return { id, props };
                throw ex;
            });
        }
        async diff(id, olds, news) {
            return call(this.name("Diff"), { id, olds, news }).catch((ex) => {
                if (ex instanceof MethodNotFoundError)
                    return { id, olds, news };
                throw ex;
            });
        }
    }
    rpc.Provider = Provider;
})(rpc || (rpc = {}));
