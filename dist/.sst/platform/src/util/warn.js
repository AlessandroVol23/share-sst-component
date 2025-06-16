const alreadyWarned = new Set();
export function warnOnce(message) {
    if (alreadyWarned.has(message))
        return;
    alreadyWarned.add(message);
    console.warn(message);
}
