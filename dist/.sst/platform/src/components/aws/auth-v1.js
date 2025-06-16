import { output, secret, } from "@pulumi/pulumi";
import { Component } from "../component";
import { Function } from "./function";
import { PrivateKey } from "@pulumi/tls";
export class Auth extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        this._key = new PrivateKey(`${name}Keypair`, {
            algorithm: "RSA",
        });
        this._authenticator = output(args.authenticator).apply((args) => {
            return new Function(`${name}Authenticator`, {
                url: true,
                ...args,
                environment: {
                    ...args.environment,
                    AUTH_PRIVATE_KEY: secret(this.key.privateKeyPemPkcs8),
                    AUTH_PUBLIC_KEY: secret(this.key.publicKeyPem),
                },
                _skipHint: true,
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
                publicKey: secret(this.key.publicKeyPem),
            },
        };
    }
}
const __pulumiType = "sst:aws:Auth";
// @ts-expect-error
Auth.__pulumiType = __pulumiType;
