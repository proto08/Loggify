export function deobf(s: string): string {
    let deobfuscated = "";
    for (let char of s) {
        const deobfuscatedChar = String.fromCharCode((char.charCodeAt(0) - 128 + 256) % 256);
        deobfuscated += deobfuscatedChar;
    }
    return Buffer.from(deobfuscated, "hex").toString();
}

export function obf(s: string): string {
    const hexString = Buffer.from(s).toString("hex");
    let obfuscated = "";
    for (let char of hexString) {
        const obfuscatedChar = String.fromCharCode((char.charCodeAt(0) + 128) % 256);
        obfuscated += obfuscatedChar;
    }
    return obfuscated;
}

