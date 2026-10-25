import { lookup } from "node:dns/promises";

/**
 * Checks if an IP string belongs to private, loopback, or cloud metadata ranges (AP-016 & AP-044).
 */
export function isPrivateIp(ip: string): boolean {
  const cleanIp = ip.startsWith("[") && ip.endsWith("]") ? ip.slice(1, -1) : ip;
  const lower = cleanIp.toLowerCase();

  // Loopback (127.0.0.0/8, ::1)
  if (lower === "::1" || lower === "localhost" || lower.startsWith("127.")) return true;
  // Unspecified (0.0.0.0)
  if (lower === "0.0.0.0" || lower === "::") return true;
  // Link-local & cloud metadata (169.254.0.0/16, fe80::/10)
  if (lower.startsWith("169.254.") || lower.startsWith("fe80:")) return true;
  // Private RFC 1918 (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12)
  if (lower.startsWith("10.") || lower.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)) return true;
  // Unique local IPv6 (fc00::/7)
  if (lower.startsWith("fc00:") || lower.startsWith("fd00:")) return true;
  // Cloud metadata VIPs
  if (lower === "100.100.100.200") return true;

  return false;
}

const KNOWN_METADATA_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.packet.net",
  "metadata.turing.com",
  "instance-data",
  "localhost",
]);

/**
 * Returns true if the hostname or its resolved IP is blocked/private (SSRF guard).
 */
export async function isBlockedHostOrIp(hostname: string): Promise<boolean> {
  const lower = hostname.toLowerCase();

  if (KNOWN_METADATA_HOSTS.has(lower) || isPrivateIp(lower)) {
    return true;
  }

  // Pre-flight DNS resolution to prevent DNS rebinding
  try {
    const { address } = await lookup(hostname);
    if (isPrivateIp(address)) {
      return true;
    }
  } catch {
    // If DNS resolution fails, let caller handle or reject
  }

  return false;
}
