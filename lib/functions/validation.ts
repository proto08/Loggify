export function isValidIP(ip: string): boolean {
    const ipRegex = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;
    return ip.match(ipRegex) !== null;
}

export function isValidUserAgent(userAgent: string): boolean {
  if (!userAgent || userAgent.trim() === '') {
    return false;
  }
  
  if (userAgent.length < 5 || userAgent.length > 2000) {
    return false;
  }
  
  const commonBrowserPatterns = [
    /Mozilla\/[\d\.]+/i,
    /Chrome\/[\d\.]+/i,
    /Safari\/[\d\.]+/i,
    /Firefox\/[\d\.]+/i,
    /Edge\/[\d\.]+/i,
    /MSIE [\d\.]+/i,
    /Trident\/[\d\.]+/i,
    /Opera\/[\d\.]+/i,
    /OPR\/[\d\.]+/i
  ];
  
  const hasValidBrowserPattern = commonBrowserPatterns.some(pattern => 
    pattern.test(userAgent)
  );
  
  const suspiciousPatterns = [
    /script/i,
    /eval\(/i,
    /javascript:/i,
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/
  ];
  
  const hasSuspiciousPattern = suspiciousPatterns.some(pattern => 
    pattern.test(userAgent)
  );
  
  return hasValidBrowserPattern && !hasSuspiciousPattern;
}