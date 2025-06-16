export function lazy(callback) {
    let loaded = false;
    let result;
    return () => {
        if (!loaded) {
            loaded = true;
            result = callback();
        }
        return result;
    };
}
