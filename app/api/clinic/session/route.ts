import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import {
  CLINIC_SESSION_MAX_AGE_SECONDS,
  clinicSessionCookie,
  expiredClinicSessionCookie,
  getClinicSession,
  hashPassword,
  normalizeEmail,
  sha256,
  verifyPassword,
} from "../auth";

type LoginBody = {
  action?: "login" | "setup";
  fullName?: string;
  email?: string;
  password?: string;
  setupKey?: string;
};

function issueSession(user: { id: number; clinicId: number; fullName: string; email: string; role: string }) {
  return (async () => {
    const { getDb } = await import("../../../../db");
    const { clinicSessions } = await import("../../../../db/schema");
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + CLINIC_SESSION_MAX_AGE_SECONDS * 1000).toISOString();
    await getDb().insert(clinicSessions).values({ clinicUserId: user.id, tokenHash: await sha256(token), expiresAt });
    return Response.json({ authenticated: true, user: { clinicId: user.clinicId, fullName: user.fullName, email: user.email, role: user.role } }, {
      headers: { "Set-Cookie": clinicSessionCookie(token) },
    });
  })();
}

export async function GET(request: Request) {
  try {
    const user = await getClinicSession(request);
    return Response.json(user ? { authenticated: true, user } : { authenticated: false });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible comprobar la sesión." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as LoginBody;
    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10) {
      return Response.json({ error: "Usa un correo válido y una contraseña de al menos 10 caracteres." }, { status: 400 });
    }
    const { getDb } = await import("../../../../db");
    const { clinics, clinicUsers } = await import("../../../../db/schema");
    const db = getDb();

    if (body.action === "setup") {
      const fullName = body.fullName?.trim() ?? "";
      const configuredSetupKey = (env as unknown as { CLINIC_SETUP_KEY?: string }).CLINIC_SETUP_KEY;
      if (!fullName) return Response.json({ error: "Indica el nombre de la persona administradora." }, { status: 400 });
      if (!configuredSetupKey) return Response.json({ error: "Falta habilitar la clave de configuración de clínica." }, { status: 503 });
      if (body.setupKey !== configuredSetupKey) return Response.json({ error: "La clave de configuración no es válida." }, { status: 401 });
      const existingUsers = await db.select({ id: clinicUsers.id }).from(clinicUsers).limit(1);
      if (existingUsers.length > 0) return Response.json({ error: "La clínica ya tiene un acceso configurado. Inicia sesión." }, { status: 409 });
      const [clinic] = await db.select({ id: clinics.id }).from(clinics).limit(1);
      if (!clinic) return Response.json({ error: "No encontramos la clínica configurada." }, { status: 404 });
      const [user] = await db.insert(clinicUsers).values({
        clinicId: clinic.id, fullName, email, passwordHash: await hashPassword(password), role: "admin",
      }).returning();
      return issueSession(user);
    }

    const [user] = await db.select().from(clinicUsers).where(eq(clinicUsers.email, email)).limit(1);
    if (!user || user.status !== "active" || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    return issueSession(user);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible iniciar sesión." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const token = request.headers.get("cookie")?.split(";").find(part => part.trim().startsWith("medicitas_clinic_session="))?.split("=").slice(1).join("=");
  if (token) {
    const { getDb } = await import("../../../../db");
    const { clinicSessions } = await import("../../../../db/schema");
    await getDb().update(clinicSessions).set({ revokedAt: new Date().toISOString() }).where(eq(clinicSessions.tokenHash, await sha256(token)));
  }
  return Response.json({ success: true }, { headers: { "Set-Cookie": expiredClinicSessionCookie() } });
}
