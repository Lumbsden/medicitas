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
    // La clínica demo siempre empieza con cupos futuros. Guardamos los
    // instantes en UTC y la interfaz los presenta en la hora local del paciente.
    const timeSlots = [
      { dayOffset: 1, hour: 9, minute: 0 },
      { dayOffset: 2, hour: 11, minute: 15 },
      { dayOffset: 3, hour: 15, minute: 30 },
    ];
    const dates = timeSlots.map(({ dayOffset, hour, minute }) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + dayOffset);
      // Panamá usa UTC-5. El MVP piloto trabaja con ese huso horario.
      date.setUTCHours(hour + 5, minute, 0, 0);
      return date.toISOString();
    });
    await db.insert(availability).values(createdDoctors.flatMap(doctor =>
      dates.map(startsAt => ({
        doctorId: doctor.id,
        startsAt,
        endsAt: new Date(new Date(startsAt).getTime() + 30 * 60 * 1000).toISOString(),
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
