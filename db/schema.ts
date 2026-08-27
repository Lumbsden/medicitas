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
});

export const patients = sqliteTable("patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  email: text("email"),
  createdAt,
});

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  availabilityId: integer("availability_id").notNull().references(() => availability.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  status: text("status").notNull().default("pending"),
  reservationCode: text("reservation_code").notNull(),
  createdAt,
}, table => [
  uniqueIndex("appointments_availability_unique").on(table.availabilityId),
  uniqueIndex("appointments_reservation_code_unique").on(table.reservationCode),
]);
