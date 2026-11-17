import crypto from "crypto";

const TOKEN_PEPPER = process.env.TOKEN_PEPPER || "diu-pgms-secret-pepper-2026";

/**
 * Generate a high-entropy cryptographically secure random token
 * @param prefix 'pgms_tm_' for team management, 'pgms_mem_' for individual membership
 */
export function generateToken(prefix: "pgms_tm_" | "pgms_mem_"): string {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  return `${prefix}${randomBytes}`;
}

/**
 * Hash a reference token using SHA-256 with an internal pepper
 * Never store the raw token in database
 */
export function hashToken(token: string): string {
  const normalized = token.trim();
  return crypto
    .createHash("sha256")
    .update(`${normalized}:${TOKEN_PEPPER}`)
    .digest("hex");
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeMatch(token: string, hashedToken: string): boolean {
  try {
    const computedHash = hashToken(token);
    const bufA = Buffer.from(computedHash, "utf8");
    const bufB = Buffer.from(hashedToken, "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
