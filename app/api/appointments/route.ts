import { and, eq, sql } from "drizzle-orm";
import { getClinicSession } from "../clinic/auth";

function normalizeWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "");
  // Panamá es el mercado piloto. Guardamos siempre el prefijo de país para
  // poder migrar luego a WhatsApp Business sin datos ambiguos.
  if (digits.length === 8) return `507${digits}`;
  return digits;
}

export async function GET(request: Request) {
  try {
    const staff = await getClinicSession(request);
    if (!staff) return Response.json({ error: "Inicia sesión como clínica para ver la agenda." }, { status: 401 });
    const { getDb } = await import("../../../db");
    const { appointments, availability, doctors, patients } = await import("../../../db/schema");
    const db = getDb();
    const rows = await db.select({
      id: appointments.id, status: appointments.status, reservationCode: appointments.reservationCode,
      patientName: patients.fullName, startsAt: availability.startsAt, doctorName: doctors.fullName, specialty: doctors.specialty,
    }).from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(availability, eq(appointments.availabilityId, availability.id))
      .innerJoin(doctors, eq(availability.doctorId, doctors.id))
      .where(eq(doctors.clinicId, staff.clinicId));
    return Response.json({ appointments: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible cargar las citas.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const staff = await getClinicSession(request);
    if (!staff) return Response.json({ error: "Inicia sesión como clínica para gestionar citas." }, { status: 401 });
    const body = await request.json() as { id?: number; status?: "confirmed" | "cancelled" | "reschedule_requested" };
    if (!Number.isInteger(body.id) || !["confirmed", "cancelled", "reschedule_requested"].includes(body.status ?? "")) {
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    }
    const { getDb } = await import("../../../db");
    const { appointments, availability, doctors } = await import("../../../db/schema");
    const db = getDb();
    const [appointment] = await db.select({ id: appointments.id, availabilityId: appointments.availabilityId })
      .from(appointments)
      .innerJoin(availability, eq(appointments.availabilityId, availability.id))
      .innerJoin(doctors, eq(availability.doctorId, doctors.id))
      .where(and(eq(appointments.id, body.id!), eq(doctors.clinicId, staff.clinicId)))
      .limit(1);
    if (!appointment) return Response.json({ error: "Cita no encontrada." }, { status: 404 });
    await db.update(appointments).set({
      status: body.status!,
      updatedAt: sql`CURRENT_TIMESTAMP`,
      ...(body.status === "cancelled" ? { cancelledAt: sql`CURRENT_TIMESTAMP` } : { rescheduleRequestedAt: sql`CURRENT_TIMESTAMP` }),
    }).where(eq(appointments.id, appointment.id));
    if (body.status === "cancelled") {
      await db.update(availability).set({ status: "available" }).where(eq(availability.id, appointment.availabilityId));
    }
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible actualizar la cita.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { fullName?: string; whatsapp?: string; availabilityId?: number };
    const fullName = body.fullName?.trim() ?? "";
    const whatsapp = body.whatsapp?.trim() ?? "";
    const whatsappNormalized = normalizeWhatsApp(whatsapp);
    const availabilityId = Number(body.availabilityId);
    if (!fullName || whatsappNormalized.length < 10 || !Number.isInteger(availabilityId)) {
      return Response.json({ error: "Nombre, WhatsApp y horario son obligatorios." }, { status: 400 });
    }
    const { getDb } = await import("../../../db");
    const { appointments, availability, patients } = await import("../../../db/schema");
    const db = getDb();
    const [slot] = await db.select().from(availability).where(eq(availability.id, availabilityId)).limit(1);
    if (!slot || slot.status !== "available") {
      return Response.json({ error: "Este horario ya no está disponible." }, { status: 409 });
    }
    const [patient] = await db.insert(patients).values({ fullName, whatsapp, whatsappNormalized })
      .onConflictDoUpdate({
        target: patients.whatsappNormalized,
        set: { fullName, whatsapp, updatedAt: sql`CURRENT_TIMESTAMP` },
      })
      .returning();
    const code = "MC-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    try {
      const [appointment] = await db.insert(appointments).values({ availabilityId, patientId: patient.id, reservationCode: code, status: "pending" }).returning();
      await db.update(availability).set({ status: "reserved" }).where(eq(availability.id, availabilityId));
      return Response.json({ appointment, reservationCode: code }, { status: 201 });
    } catch {
      return Response.json({ error: "Este horario acaba de ser tomado. Elige otro." }, { status: 409 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible crear la cita.";
    return Response.json({ error: message }, { status: 500 });
  }
}
