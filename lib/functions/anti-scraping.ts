import { base58 } from '@scure/base';

function toUint8Array(s: string): Uint8Array {
    const textEncoder = new TextEncoder();
    return textEncoder.encode(s);
}

function uint8toStr(u: Uint8Array): string {
    const textDecoder = new TextDecoder();
    return textDecoder.decode(u);
}

export function deobf(s: string): string {
    const d = Buffer.from(s, "hex").toString();
    let deobfuscated = "";
    for (const char of d) {
        const deobfuscatedChar = String.fromCharCode((char.charCodeAt(0) - 227 + 256) % 256);
        deobfuscated += deobfuscatedChar;
    }

    const d2 = atob(deobfuscated);
    const d3 = Buffer.from(d2, "hex").toString();
    const d4 = base58.decode(d3);
    const d5 = Buffer.from(uint8toStr(d4), "hex").toString();
    return d5;
}

export function obf(s: string): string {
    const e = Buffer.from(s).toString("hex");
    const e2 = base58.encode(toUint8Array(e));
    const e3 = Buffer.from(e2).toString("hex");
    const e4 = btoa(e3)
    let obfuscated = "";
    for (const char of e4) {
        const obfuscatedChar = String.fromCharCode((char.charCodeAt(0) + 227) % 256);
        obfuscated += obfuscatedChar;
    }
    const e5 = Buffer.from(obfuscated).toString("hex");
    return e5
}
