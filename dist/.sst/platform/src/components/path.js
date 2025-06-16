import path from "path";
export function toPosix(p) {
    return p.split(path.sep).join(path.posix.sep);
}
