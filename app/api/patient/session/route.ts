import { and, eq, gt, isNull } from "drizzle-orm";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function normalizeWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 8 ? `507${digits}` : digits;
}

function getCookie(request: Request, name: string) {
  const encoded = request.headers.get("cookie")?.split(";").find(part => part.trim().startsWith(`${name}=`));
  return encoded?.split("=").slice(1).join("=") ?? null;
}

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: Request) {
  try {
    const token = getCookie(request, "medicitas_patient_session");
    if (!token) return Response.json({ authenticated: false });
    const { getDb } = await import("../../../../db");
    const { patients, patientSessions } = await import("../../../../db/schema");
    const db = getDb();
    const [session] = await db.select({ patientId: patients.id, fullName: patients.fullName })
      .from(patientSessions)
      .innerJoin(patients, eq(patientSessions.patientId, patients.id))
      .where(and(eq(patientSessions.tokenHash, await hash(token)), gt(patientSessions.expiresAt, new Date().toISOString()), isNull(patientSessions.revokedAt)))
      .limit(1);
    return Response.json(session ? { authenticated: true, patient: session } : { authenticated: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible comprobar la sesión.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { whatsapp?: string; reservationCode?: string };
    const whatsappNormalized = normalizeWhatsApp(body.whatsapp?.trim() ?? "");
    const reservationCode = body.reservationCode?.trim().toUpperCase() ?? "";
    if (whatsappNormalized.length < 10 || !/^MC-[A-F0-9]{8}$/.test(reservationCode)) {
      return Response.json({ error: "Ingresa el WhatsApp y un código de reserva válido." }, { status: 400 });
    }
    const { getDb } = await import("../../../../db");
    const { appointments, patients, patientSessions } = await import("../../../../db/schema");
    const db = getDb();
    const [patient] = await db.select({ id: patients.id, fullName: patients.fullName })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(eq(patients.whatsappNormalized, whatsappNormalized), eq(appointments.reservationCode, reservationCode)))
      .limit(1);
    if (!patient) return Response.json({ error: "No encontramos una reserva con esos datos." }, { status: 401 });

    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
    await db.insert(patientSessions).values({ patientId: patient.id, tokenHash: await hash(token), expiresAt });
    return Response.json({ authenticated: true, patient }, {
      headers: { "Set-Cookie": `medicitas_patient_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}` },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible iniciar sesión.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const token = getCookie(request, "medicitas_patient_session");
  if (token) {
    const { getDb } = await import("../../../../db");
    const { patientSessions } = await import("../../../../db/schema");
    await getDb().update(patientSessions).set({ revokedAt: new Date().toISOString() }).where(eq(patientSessions.tokenHash, await hash(token)));
  }
  return Response.json({ success: true }, { headers: { "Set-Cookie": "medicitas_patient_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" } });
}
