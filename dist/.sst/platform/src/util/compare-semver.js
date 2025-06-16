export function compareSemver(v1, v2) {
    if (v1 === "latest")
        return 1;
    if (/^[^\d]/.test(v1)) {
        v1 = v1.substring(1);
    }
    if (/^[^\d]/.test(v2)) {
        v2 = v2.substring(1);
    }
    const [major1, minor1, patch1] = v1.split(".").map(Number);
    const [major2, minor2, patch2] = v2.split(".").map(Number);
    if (major1 !== major2)
        return major1 - major2;
    if (minor1 !== minor2)
        return minor1 - minor2;
    return patch1 - patch2;
}
export function isALteB(a, b) {
    return compareSemver(a, b) <= 0;
}
export function isALtB(a, b) {
    return compareSemver(a, b) < 0;
}
