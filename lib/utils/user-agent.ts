export interface ParsedUA {
  device_type: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
}

export function parseUserAgent(ua: string): ParsedUA {
  if (!ua) return { device_type: 'desktop', browser: 'Unknown', os: 'Unknown' };

  // Device type
  let device_type: ParsedUA['device_type'] = 'desktop';
  if (/iPad|tablet|PlayBook/i.test(ua)) {
    device_type = 'tablet';
  } else if (/Mobile|iPhone|iPod|Android.*Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)) {
    device_type = 'mobile';
  }

  // Browser
  let browser = 'Other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  // OS
  let os = 'Other';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X|macOS/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';

  return { device_type, browser, os };
}
