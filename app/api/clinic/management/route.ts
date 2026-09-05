import { and, asc, eq, gt } from "drizzle-orm";
import { getClinicSession } from "../auth";

type ManagementBody = {
  action?: "doctor" | "update_doctor" | "availability" | "update_availability";
  id?: number;
  fullName?: string;
  specialty?: string;
  status?: "active" | "inactive" | "available" | "blocked";
  doctorId?: number;
  startsAt?: string;
};

export async function GET(request: Request) {
  try {
    const staff = await getClinicSession(request);
    if (!staff) return Response.json({ error: "Inicia sesión como clínica para gestionar la agenda." }, { status: 401 });
    const { getDb } = await import("../../../../db");
    const { availability, clinics, doctors } = await import("../../../../db/schema");
    const db = getDb();
    const [clinic] = await db.select().from(clinics).where(eq(clinics.id, staff.clinicId)).limit(1);
    const doctorRows = await db.select().from(doctors).where(eq(doctors.clinicId, staff.clinicId)).orderBy(asc(doctors.fullName));
    const slotRows = await db.select({
      id: availability.id, doctorId: availability.doctorId, startsAt: availability.startsAt,
      endsAt: availability.endsAt, status: availability.status, doctorName: doctors.fullName,
    }).from(availability)
      .innerJoin(doctors, eq(availability.doctorId, doctors.id))
      .where(and(eq(doctors.clinicId, staff.clinicId), gt(availability.startsAt, new Date(Date.now() - 60 * 60 * 1000).toISOString())))
      .orderBy(asc(availability.startsAt));
    return Response.json({ clinic, doctors: doctorRows, availability: slotRows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible cargar la configuración." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const staff = await getClinicSession(request);
    if (!staff) return Response.json({ error: "Inicia sesión como clínica para realizar cambios." }, { status: 401 });
    const body = await request.json() as ManagementBody;
    const { getDb } = await import("../../../../db");
    const { availability, doctors } = await import("../../../../db/schema");
    const db = getDb();

    if (body.action === "doctor") {
      if (staff.role !== "admin") return Response.json({ error: "Solo la persona administradora puede agregar médicos." }, { status: 403 });
      const fullName = body.fullName?.trim() ?? "";
      const specialty = body.specialty?.trim() ?? "";
      if (fullName.length < 3 || specialty.length < 3) return Response.json({ error: "Indica el nombre y la especialidad del médico." }, { status: 400 });
      const [doctor] = await db.insert(doctors).values({ clinicId: staff.clinicId, fullName, specialty, status: "active" }).returning();
      return Response.json({ doctor }, { status: 201 });
    }

    if (body.action === "update_doctor") {
      if (staff.role !== "admin") return Response.json({ error: "Solo la persona administradora puede modificar médicos." }, { status: 403 });
      if (!Number.isInteger(body.id)) return Response.json({ error: "Médico no válido." }, { status: 400 });
      const fullName = body.fullName?.trim() ?? "";
      const specialty = body.specialty?.trim() ?? "";
      const status = body.status === "inactive" ? "inactive" : "active";
      if (fullName.length < 3 || specialty.length < 3) return Response.json({ error: "Indica el nombre y la especialidad del médico." }, { status: 400 });
      const [doctor] = await db.select({ id: doctors.id }).from(doctors).where(and(eq(doctors.id, body.id), eq(doctors.clinicId, staff.clinicId))).limit(1);
      if (!doctor) return Response.json({ error: "No encontramos ese médico en tu clínica." }, { status: 404 });
      await db.update(doctors).set({ fullName, specialty, status }).where(eq(doctors.id, doctor.id));
      return Response.json({ success: true });
    }

    if (body.action === "update_availability") {
      if (!Number.isInteger(body.id) || !["available", "blocked"].includes(body.status ?? "")) return Response.json({ error: "Horario no válido." }, { status: 400 });
      const [slot] = await db.select({ id: availability.id, status: availability.status })
        .from(availability).innerJoin(doctors, eq(availability.doctorId, doctors.id))
        .where(and(eq(availability.id, body.id), eq(doctors.clinicId, staff.clinicId))).limit(1);
      if (!slot) return Response.json({ error: "No encontramos ese horario." }, { status: 404 });
      if (slot.status === "reserved") return Response.json({ error: "No puedes bloquear un horario que ya tiene una cita." }, { status: 409 });
      await db.update(availability).set({ status: body.status! }).where(eq(availability.id, slot.id));
      return Response.json({ success: true });
    }

    if (body.action === "availability") {
      if (!Number.isInteger(body.doctorId) || !body.startsAt) return Response.json({ error: "Selecciona un médico y una fecha con hora." }, { status: 400 });
      const startsAt = new Date(body.startsAt);
      if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) return Response.json({ error: "El horario debe ser futuro." }, { status: 400 });
      const [doctor] = await db.select({ id: doctors.id }).from(doctors).where(and(eq(doctors.id, body.doctorId), eq(doctors.clinicId, staff.clinicId), eq(doctors.status, "active"))).limit(1);
      if (!doctor) return Response.json({ error: "El médico no pertenece a esta clínica o no está activo." }, { status: 404 });
      try {
        const [slot] = await db.insert(availability).values({
          doctorId: doctor.id,
          startsAt: startsAt.toISOString(),
          endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000).toISOString(),
          status: "available",
        }).returning();
        return Response.json({ availability: slot }, { status: 201 });
      } catch {
        return Response.json({ error: "Ese médico ya tiene un cupo en ese horario." }, { status: 409 });
      }
    }

    return Response.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible guardar el cambio." }, { status: 500 });
  }
}
