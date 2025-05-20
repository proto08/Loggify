import { GpsData, ScreenSize } from "../types/userdata";

export function isValidIP(ip: string): boolean {
    const ipRegex = /(?:^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$)|(?:^(?:(?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(?::[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(?::[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(?::[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(?::[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?$)/gm;
    return ipRegex.test(ip)
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

export function isValidGps(gps: GpsData): boolean {
    if (gps.hh < -90 || gps.hh > 90) {
        return false;
    }
    if (gps.xf < -180 || gps.xf > 180) {
        return false;
    }
    return true;
}

export function isValidScreenSize(screenSize: ScreenSize): boolean {
    if (screenSize.w < 100 || screenSize.w > 10000) {
        return false;
    }
    if (screenSize.h < 100 || screenSize.h > 10000) {
        return false;
    }
    return true;
}

