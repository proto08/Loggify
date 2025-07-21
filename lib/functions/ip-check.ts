import asnList from "@/lib/asn.json";

export async function isHosting(ip: string): Promise<boolean> {
  const asn = await getASN(ip);
  if (!asn) {
    return false;
  }
  return asnList.includes(asn);
}

async function getASN(ip: string): Promise<number | null> {
  try {
    const response = await fetch(`https://ipinfo.io/${ip}/json`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const match = data.org?.match(/AS(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  } catch {
    return null;
  }
}
