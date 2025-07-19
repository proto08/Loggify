import { base32, base58 } from "@scure/base";

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
  const e4 = btoa(e3);
  let obfuscated = "";
  for (const char of e4) {
    const obfuscatedChar = String.fromCharCode((char.charCodeAt(0) + 227) % 256);
    obfuscated += obfuscatedChar;
  }
  const e5 = Buffer.from(obfuscated).toString("hex");
  return e5;
}

export function obf2(s: string): string {
  const e = Buffer.from(s).toString("hex");
  const e2 = base58.encode(toUint8Array(e));
  const e3 = Buffer.from(e2).toString("hex");
  let obfuscated = "";
  for (const char of e3) {
    const obfuscatedChar = String.fromCharCode((char.charCodeAt(0) + 163) % 256);
    obfuscated += obfuscatedChar;
  }
  const e4 = base32.encode(toUint8Array(obfuscated));
  const e5 = Buffer.from(e4).toString("hex");
  const e6 = btoa(e5);
  let obfuscated2 = "";
  for (const char of e6) {
    const obfuscatedChar2 = String.fromCharCode((char.charCodeAt(0) + 34) % 256);
    obfuscated2 += obfuscatedChar2;
  }
  const e7 = Buffer.from(obfuscated2).toString("hex");
  const e8 = base58.encode(toUint8Array(e7));
  return e8;
}

export function deobf2(s: string): string {
  const d = base58.decode(s);
  const d2 = Buffer.from(uint8toStr(d), "hex").toString();
  let deobfuscated2 = "";
  for (const char of d2) {
    const deobfuscatedChar2 = String.fromCharCode((char.charCodeAt(0) - 34 + 256) % 256);
    deobfuscated2 += deobfuscatedChar2;
  }
  const d3 = atob(deobfuscated2);
  const d4 = Buffer.from(d3, "hex").toString();
  const d5 = base32.decode(d4);
  let deobfuscated = "";
  for (const char of uint8toStr(d5)) {
    const deobfuscatedChar = String.fromCharCode((char.charCodeAt(0) - 163 + 256) % 256);
    deobfuscated += deobfuscatedChar;
  }
  const d6 = Buffer.from(deobfuscated, "hex").toString();
  const d7 = base58.decode(d6);
  const d8 = Buffer.from(uint8toStr(d7), "hex").toString();
  return d8;
}
