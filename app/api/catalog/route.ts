async function loadCatalog() {
  const { getDb } = await import("../../../db");
  const { clinics, doctors, availability } = await import("../../../db/schema");
  const db = getDb();
  let clinicRows = await db.select().from(clinics).limit(1);
  if (clinicRows.length === 0) {
    const [clinic] = await db.insert(clinics).values({
      name: "Clínica Demo", address: "Dirección de demostración", whatsapp: "+507 6000-0000",
    }).returning();
    const createdDoctors = await db.insert(doctors).values([
      { clinicId: clinic.id, fullName: "Dra. Valeria Gómez", specialty: "Medicina general" },
      { clinicId: clinic.id, fullName: "Dr. Daniel Pérez", specialty: "Pediatría" },
      { clinicId: clinic.id, fullName: "Dra. Elena Castillo", specialty: "Ginecología" },
    ]).returning();
    const dates = ["2026-08-19T09:00:00", "2026-08-19T11:15:00", "2026-08-19T15:30:00"];
    await db.insert(availability).values(createdDoctors.flatMap(doctor =>
      dates.map((startsAt, index) => ({
        doctorId: doctor.id, startsAt, endsAt: ["2026-08-19T09:30:00", "2026-08-19T11:45:00", "2026-08-19T16:00:00"][index],
      }))
    ));
    clinicRows = [clinic];
  }
  const doctorRows = await db.select().from(doctors);
  const slotRows = await db.select().from(availability);
  return { clinic: clinicRows[0], doctors: doctorRows, availability: slotRows };
}

export async function GET() {
  try {
    return Response.json(await loadCatalog());
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible cargar el catálogo.";
    return Response.json({ error: message }, { status: 500 });
  }
}
