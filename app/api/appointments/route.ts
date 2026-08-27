import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { getDb } = await import("../../../db");
    const { appointments, availability, doctors, patients } = await import("../../../db/schema");
    const db = getDb();
    const rows = await db.select({
      id: appointments.id, status: appointments.status, reservationCode: appointments.reservationCode,
      patientName: patients.fullName, startsAt: availability.startsAt, doctorName: doctors.fullName, specialty: doctors.specialty,
    }).from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(availability, eq(appointments.availabilityId, availability.id))
      .innerJoin(doctors, eq(availability.doctorId, doctors.id));
    return Response.json({ appointments: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible cargar las citas.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { id?: number; status?: "cancelled" | "reschedule_requested" };
    if (!Number.isInteger(body.id) || !["cancelled", "reschedule_requested"].includes(body.status ?? "")) {
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    }
    const { getDb } = await import("../../../db");
    const { appointments, availability } = await import("../../../db/schema");
    const db = getDb();
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, body.id!)).limit(1);
    if (!appointment) return Response.json({ error: "Cita no encontrada." }, { status: 404 });
    await db.update(appointments).set({ status: body.status! }).where(eq(appointments.id, appointment.id));
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
    const availabilityId = Number(body.availabilityId);
    if (!fullName || !whatsapp || !Number.isInteger(availabilityId)) {
      return Response.json({ error: "Nombre, WhatsApp y horario son obligatorios." }, { status: 400 });
    }
    const { getDb } = await import("../../../db");
    const { appointments, availability, patients } = await import("../../../db/schema");
    const db = getDb();
    const [slot] = await db.select().from(availability).where(eq(availability.id, availabilityId)).limit(1);
    if (!slot || slot.status !== "available") {
      return Response.json({ error: "Este horario ya no está disponible." }, { status: 409 });
    }
    const [patient] = await db.insert(patients).values({ fullName, whatsapp }).returning();
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
