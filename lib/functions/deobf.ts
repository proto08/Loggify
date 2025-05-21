import { base58 } from '@scure/base';

const kr = [
    [200, 196, 157, 49, 219, 232, 69, 76, 83, 241, 90, 229, 150, 242, 92, 15, 84, 148, 229, 112, 54, 1, 119, 2, 169, 57, 211, 105, 136, 202, 103, 168],
    [234, 169, 154, 104, 251, 227, 123, 14, 69, 153, 122, 248, 216, 214, 90, 81, 11, 135, 195, 113, 29, 23, 116, 2, 161, 38, 253, 115, 142, 200, 42, 189],
    [200, 165, 201, 110, 242, 224, 40, 65, 59, 242, 81, 195, 162, 188, 101, 3, 79, 254, 234, 10, 16, 95, 72, 35, 164, 67, 164, 71, 240, 227, 121, 199],
    [245, 130, 172, 48, 216, 131, 115, 127, 66, 236, 28, 185, 136, 252, 90, 79, 119, 243, 179, 12, 72, 39, 98, 61, 137, 71, 249, 115, 214, 177, 21, 172],
    [89, 223, 151, 248, 170, 122, 131, 80, 144, 118, 56, 163, 241, 252, 134, 140, 142, 29, 185, 213, 230, 84, 127, 54, 179, 36, 10, 155, 207, 175, 138, 50],
    [14, 100, 3, 93, 159, 22, 163, 57, 95, 210, 206, 203, 142, 255, 17, 137, 104]
]

const Er = [44, 128, 188, 10, 35, 20]

function Rr(r: number): number[] {
    return mr(Er, kr[r]);
}

function fG(s: string): number[] {
    const arr: number[] = [];
    for (let i = 0; i < s.length; i++) {
        arr.push(s.charCodeAt(i));
    }
    return arr;
}

function mr(r: number[], n: number[]): number[] {
    const t: number[] = [];
    for (let i = 0; i < 256; i++) t[i] = i;
    let o = 0;
    for (let i = 0; i < 256; i++) {
        o = (o + t[i] + r[i % r.length]) % 256;
        const temp = t[i]; t[i] = t[o]; t[o] = temp;
    }

    let i = 0;
    o = 0;
    const s: number[] = [];
    for (let a = 0; a < n.length; a++) {
        i = (i + 1) % 256;
        o = (o + t[i]) % 256;
        const temp2 = t[i]; t[i] = t[o]; t[o] = temp2;
        s.push(n[a] ^ t[(t[i] + t[o]) % 256]);
    }
    return s;
}

function u<T>(func: (value: T) => number[], value: T): number[] {
    return func(value);
}

export const encrypt = (t: string) => {
    const w = mr(Rr(5), u(fG, process.env.NEXT_PUBLIC_SECRET_KEY!));
    const v = Array.prototype.slice.call(base58.decode(t));
    return Buffer.from(mr(w, v)).toString("hex");
}

export const decrypt = (encrypted: string) => {
    const encrypted2: number[] = Array.from(Buffer.from(encrypted, "hex"));
    const w = mr(Rr(5), u(fG, process.env.NEXT_PUBLIC_SECRET_KEY!));
    return base58.encode(new Uint8Array(mr(w, encrypted2)));
}
