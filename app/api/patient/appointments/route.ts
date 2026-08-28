import { and, eq, gt, isNull, sql } from "drizzle-orm";

function getCookie(request: Request, name: string) {
  const encoded = request.headers.get("cookie")?.split(";").find(part => part.trim().startsWith(`${name}=`));
  return encoded?.split("=").slice(1).join("=") ?? null;
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function getPatientId(request: Request) {
  const token = getCookie(request, "medicitas_patient_session");
  if (!token) return null;
  const { getDb } = await import("../../../../db");
  const { patientSessions } = await import("../../../../db/schema");
  const [session] = await getDb().select({ patientId: patientSessions.patientId }).from(patientSessions)
    .where(and(eq(patientSessions.tokenHash, await hash(token)), gt(patientSessions.expiresAt, new Date().toISOString()), isNull(patientSessions.revokedAt)))
    .limit(1);
  return session?.patientId ?? null;
}

export async function GET(request: Request) {
  try {
    const patientId = await getPatientId(request);
    if (!patientId) return Response.json({ error: "Sesión no válida." }, { status: 401 });
    const { getDb } = await import("../../../../db");
    const { appointments, availability, doctors } = await import("../../../../db/schema");
    const rows = await getDb().select({
      id: appointments.id, status: appointments.status, reservationCode: appointments.reservationCode,
      startsAt: availability.startsAt, doctorName: doctors.fullName, specialty: doctors.specialty,
    }).from(appointments).innerJoin(availability, eq(appointments.availabilityId, availability.id))
      .innerJoin(doctors, eq(availability.doctorId, doctors.id)).where(eq(appointments.patientId, patientId));
    return Response.json({ appointments: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible cargar tus citas.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const patientId = await getPatientId(request);
    if (!patientId) return Response.json({ error: "Sesión no válida." }, { status: 401 });
    const body = await request.json() as { id?: number; status?: "cancelled" | "reschedule_requested" };
    if (!Number.isInteger(body.id) || !["cancelled", "reschedule_requested"].includes(body.status ?? "")) {
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    }
    const { getDb } = await import("../../../../db");
    const { appointments, availability } = await import("../../../../db/schema");
    const db = getDb();
    const [appointment] = await db.select().from(appointments).where(and(eq(appointments.id, body.id!), eq(appointments.patientId, patientId))).limit(1);
    if (!appointment || appointment.status === "cancelled") return Response.json({ error: "Cita no disponible." }, { status: 404 });
    await db.update(appointments).set({
      status: body.status!, updatedAt: sql`CURRENT_TIMESTAMP`,
      ...(body.status === "cancelled" ? { cancelledAt: sql`CURRENT_TIMESTAMP` } : { rescheduleRequestedAt: sql`CURRENT_TIMESTAMP` }),
    }).where(eq(appointments.id, appointment.id));
    if (body.status === "cancelled") await db.update(availability).set({ status: "available" }).where(eq(availability.id, appointment.availabilityId));
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible actualizar la cita.";
    return Response.json({ error: message }, { status: 500 });
  }
}
