import { and, eq, gt, isNull } from "drizzle-orm";

export const CLINIC_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getCookie(request: Request, name: string) {
  const encoded = request.headers.get("cookie")?.split(";").find(part => part.trim().startsWith(`${name}=`));
  return encoded?.split("=").slice(1).join("=") ?? null;
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function getClinicSession(request: Request) {
  const token = getCookie(request, "medicitas_clinic_session");
  if (!token) return null;
  const { getDb } = await import("../../../db");
  const { clinicSessions, clinicUsers } = await import("../../../db/schema");
  const db = getDb();
  const [session] = await db.select({
    userId: clinicUsers.id,
    clinicId: clinicUsers.clinicId,
    fullName: clinicUsers.fullName,
    email: clinicUsers.email,
    role: clinicUsers.role,
  }).from(clinicSessions)
    .innerJoin(clinicUsers, eq(clinicSessions.clinicUserId, clinicUsers.id))
    .where(and(
      eq(clinicSessions.tokenHash, await sha256(token)),
      gt(clinicSessions.expiresAt, new Date().toISOString()),
      isNull(clinicSessions.revokedAt),
      eq(clinicUsers.status, "active"),
    ))
    .limit(1);
  return session ?? null;
}

export function clinicSessionCookie(token: string) {
  return `medicitas_clinic_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${CLINIC_SESSION_MAX_AGE_SECONDS}`;
}

export function expiredClinicSessionCookie() {
  return "medicitas_clinic_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function hex(bytes: Uint8Array) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function bytesFromHex(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material, 256);
  return hex(new Uint8Array(bits));
}

/** Hash PBKDF2 portable para Cloudflare Workers; jamás se almacena una clave en texto. */
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  // Cloudflare Workers limita PBKDF2 a 100 000 iteraciones.
  // Usamos el máximo admitido por el runtime para mantener el hash robusto.
  const iterations = 100000;
  return `pbkdf2$${iterations}$${hex(salt)}$${await derivePassword(password, salt, iterations)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, rawIterations, rawSalt, expected] = stored.split("$");
  const iterations = Number(rawIterations);
  if (algorithm !== "pbkdf2" || !Number.isInteger(iterations) || !rawSalt || !expected) return false;
  const actual = await derivePassword(password, bytesFromHex(rawSalt), iterations);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}
