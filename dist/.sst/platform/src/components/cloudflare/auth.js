import { output, secret, } from "@pulumi/pulumi";
import { Component } from "../component";
import { Worker } from "./worker";
import { PrivateKey } from "@pulumi/tls";
export class Auth extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        this._key = new PrivateKey(`${name}Keypair`, {
            algorithm: "RSA",
        });
        this._authenticator = output(args.authenticator).apply((args) => {
            return new Worker(`${name}Authenticator`, {
                ...args,
                url: true,
                environment: {
                    ...args.environment,
                    AUTH_PRIVATE_KEY: secret(this.key.privateKeyPemPkcs8),
                    AUTH_PUBLIC_KEY: secret(this.key.publicKeyPem),
                },
            });
        });
    }
    get key() {
        return this._key;
    }
    get authenticator() {
        return this._authenticator;
    }
    get url() {
        return this._authenticator.url;
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                url: this._authenticator.url,
                publicKey: secret(this.key.publicKeyPem),
            },
        };
    }
}
const __pulumiType = "sst:cloudflare:Auth";
// @ts-expect-error
Auth.__pulumiType = __pulumiType;
