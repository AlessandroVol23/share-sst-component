export class VisibleError extends Error {
    constructor(...message) {
        super(message.join("\n"));
    }
}
