import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`);

export const clinics = sqliteTable("clinics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  whatsapp: text("whatsapp").notNull(),
  status: text("status").notNull().default("active"),
  createdAt,
});

export const doctors = sqliteTable("doctors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clinicId: integer("clinic_id").notNull().references(() => clinics.id),
  fullName: text("full_name").notNull(),
  specialty: text("specialty").notNull(),
  status: text("status").notNull().default("active"),
  createdAt,
});

export const availability = sqliteTable("availability", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  status: text("status").notNull().default("available"),
  createdAt,
}, table => [
  // Evita que una clínica publique dos veces el mismo cupo para un médico.
  uniqueIndex("availability_doctor_starts_unique").on(table.doctorId, table.startsAt),
]);

/** Registra una apertura masiva de cupos para poder auditar la agenda. */
export const availabilitySeries = sqliteTable("availability_series", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clinicId: integer("clinic_id").notNull().references(() => clinics.id),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id),
  firstStartsAt: text("first_starts_at").notNull(),
  weeks: integer("weeks").notNull(),
  status: text("status").notNull().default("active"),
  createdAt,
});

export const patients = sqliteTable("patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  // Solo se usa internamente para identificar a la persona sin depender del
  // formato visual que escribió (por ejemplo, 6000-0000 o +507 6000-0000).
  whatsappNormalized: text("whatsapp_normalized"),
  email: text("email"),
  status: text("status").notNull().default("active"),
  createdAt,
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [
  uniqueIndex("patients_whatsapp_normalized_unique").on(table.whatsappNormalized),
]);

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  availabilityId: integer("availability_id").notNull().references(() => availability.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  status: text("status").notNull().default("pending"),
  reservationCode: text("reservation_code").notNull(),
  cancelledAt: text("cancelled_at"),
  rescheduleRequestedAt: text("reschedule_requested_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt,
}, table => [
  // Conserva el historial de una cita cancelada, pero solo permite una cita
  // activa por cupo. Así, cancelar sí libera el horario para otra reserva.
  uniqueIndex("appointments_active_availability_unique")
    .on(table.availabilityId)
    .where(sql`${table.status} IN ('pending', 'confirmed', 'reschedule_requested')`),
  uniqueIndex("appointments_reservation_code_unique").on(table.reservationCode),
]);

/** Códigos de un solo uso enviados al WhatsApp del paciente. */
export const patientLoginChallenges = sqliteTable("patient_login_challenges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  codeHash: text("code_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: text("consumed_at"),
  createdAt,
});

/** Sesiones opacas. Nunca se guarda el token real, solo su hash. */
export const patientSessions = sqliteTable("patient_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
  createdAt,
}, table => [
  uniqueIndex("patient_sessions_token_hash_unique").on(table.tokenHash),
]);

/** Personal autorizado para operar una clínica. */
export const clinicUsers = sqliteTable("clinic_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clinicId: integer("clinic_id").notNull().references(() => clinics.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  // admin administra configuración y equipo; receptionist gestiona agenda;
  // doctor queda reservado para su agenda individual.
  role: text("role").notNull().default("admin"),
  status: text("status").notNull().default("active"),
  createdAt,
}, table => [
  uniqueIndex("clinic_users_email_unique").on(table.email),
]);

/** Sesiones opacas del personal de clínica. */
export const clinicSessions = sqliteTable("clinic_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clinicUserId: integer("clinic_user_id").notNull().references(() => clinicUsers.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
  createdAt,
}, table => [
  uniqueIndex("clinic_sessions_token_hash_unique").on(table.tokenHash),
]);
