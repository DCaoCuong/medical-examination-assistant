import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './schema-users';

/**
 * REFERENCE ONLY - These tables already exist in Supabase (Booking system)
 * We're defining them here for Drizzle ORM type inference and relationships
 */

export const clinics = pgTable('clinics', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    description: text('description'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const services = pgTable('services', {
    id: uuid('id').primaryKey().defaultRandom(),
    clinic_id: uuid('clinic_id').references(() => clinics.id, { onDelete: 'cascade' }),
    patient_name: varchar('patient_name', { length: 255 }).notNull(),
    price: integer('price'),
    description: text('description'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const clinic_services = pgTable('clinic_services', {
    id: uuid('id').primaryKey().defaultRandom(),
    clinic_id: uuid('clinic_id').references(() => clinics.id, { onDelete: 'cascade' }),
    patient_name: varchar('patient_name', { length: 255 }).notNull(),
    gender: varchar('gender', { length: 20 }),
    booking_date: timestamp('booking_date').notNull(),
    booking_time: varchar('booking_time', { length: 50 }),
    status: varchar('status', { length: 50 }).default('pending'),
    service_id: uuid('service_id').references(() => services.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Bookings Table (from Booking Clinic system)
 * This is the main table for patient appointments in the integrated system
 * MEA will use this table to display and manage patient examinations
 */
export const bookings = pgTable('bookings', {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Relations
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    clinicId: uuid('clinic_id').references(() => clinics.id),
    serviceId: uuid('service_id').references(() => services.id),

    // MEA Display ID (auto-generated: BK-YYYY-NNNNNN)
    displayId: text('display_id').unique(),

    // Patient Information
    patientName: text('patient_name').notNull(),
    patientPhone: text('patient_phone').notNull(),
    gender: text('gender'),
    age: integer('age'),
    symptoms: text('symptoms'),

    // Medical Information (optional - added for MEA)
    address: text('address'),
    medicalHistory: text('medical_history'),
    allergies: text('allergies'),
    bloodType: varchar('blood_type', { length: 10 }),

    // Scheduling
    bookingTime: timestamp('booking_time').notNull(),

    // Assignment
    doctorId: uuid('doctor_id'),
    assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
    staffNote: text('staff_note'),

    // Status: pending | confirmed | in_progress | completed | cancelled
    status: varchar('status', { length: 50 }).default('pending'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Type exports
export type Clinic = typeof clinics.$inferSelect;
export type Service = typeof services.$inferSelect;
export type ClinicService = typeof clinic_services.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
