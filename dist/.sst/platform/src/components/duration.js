export function toSeconds(duration) {
    const [count, unit] = duration.split(" ");
    const countNum = parseInt(count);
    const unitLower = unit.toLowerCase();
    if (unitLower.startsWith("second")) {
        return countNum;
    }
    else if (unitLower.startsWith("minute")) {
        return countNum * 60;
    }
    else if (unitLower.startsWith("hour")) {
        return countNum * 3600;
    }
    else if (unitLower.startsWith("day")) {
        return countNum * 86400;
    }
    throw new Error(`Invalid duration ${duration}`);
}
