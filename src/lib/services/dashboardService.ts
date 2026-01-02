import { db, examinationSessions, medicalRecords, bookings } from '../db';
import { eq, gte, desc, sql, and } from 'drizzle-orm';

export interface DashboardStats {
    today: {
        totalSessions: number;
        completedSessions: number;
        activeSessions: number;
    };
    thisWeek: {
        totalSessions: number;
        newBookings: number;
    };
    thisMonth: {
        totalSessions: number;
        newBookings: number;
    };
    total: {
        bookings: number;
        sessions: number;
    };
}

export interface RecentSession {
    id: string;
    bookingId: string | null;
    patientName: string;
    patientDisplayId: string;
    visitNumber: number;
    chiefComplaint: string | null;
    status: string;
    createdAt: Date;
    diagnosis?: string;
}

export interface BookingSummary {
    id: string;
    displayId: string | null;
    patientName: string;
    patientPhone: string;
    age: number | null;
    gender: string | null;
    symptoms: string | null;
    bookingTime: Date;
    status: string | null;
    // Session info (if exists)
    hasSession: boolean;
    sessionStatus: string | null;
}

/**
 * Get dashboard statistics
 * Now uses bookings table instead of users
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();

    // Calculate date boundaries
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's sessions
    const todaySessions = await db
        .select()
        .from(examinationSessions)
        .where(gte(examinationSessions.createdAt, todayStart));

    const todayCompleted = todaySessions.filter(s => s.status === 'completed').length;
    const todayActive = todaySessions.filter(s => s.status === 'active').length;

    // This week's sessions
    const weekSessions = await db
        .select()
        .from(examinationSessions)
        .where(gte(examinationSessions.createdAt, weekStart));

    // This week's new bookings (from Booking Clinic)
    const weekNewBookings = await db
        .select()
        .from(bookings)
        .where(gte(bookings.createdAt, weekStart));

    // This month's sessions
    const monthSessions = await db
        .select()
        .from(examinationSessions)
        .where(gte(examinationSessions.createdAt, monthStart));

    // This month's new bookings
    const monthNewBookings = await db
        .select()
        .from(bookings)
        .where(gte(bookings.createdAt, monthStart));

    // Total counts
    const totalBookingsResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(bookings);

    const totalSessionsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(examinationSessions);

    return {
        today: {
            totalSessions: todaySessions.length,
            completedSessions: todayCompleted,
            activeSessions: todayActive
        },
        thisWeek: {
            totalSessions: weekSessions.length,
            newBookings: weekNewBookings.length
        },
        thisMonth: {
            totalSessions: monthSessions.length,
            newBookings: monthNewBookings.length
        },
        total: {
            bookings: totalBookingsResult[0]?.count || 0,
            sessions: totalSessionsResult[0]?.count || 0
        }
    };
}

/**
 * Get sessions with booking info (with pagination)
 * Now joins with bookings instead of users
 */
export async function getRecentSessions(limit: number = 50, page: number = 1): Promise<RecentSession[]> {
    const offset = (page - 1) * limit;

    const sessions = await db
        .select({
            sessionId: examinationSessions.id,
            bookingId: examinationSessions.bookingId,
            visitNumber: examinationSessions.visitNumber,
            chiefComplaint: examinationSessions.chiefComplaint,
            status: examinationSessions.status,
            createdAt: examinationSessions.createdAt,
            patientName: bookings.patientName,
            patientDisplayId: bookings.displayId,
        })
        .from(examinationSessions)
        .leftJoin(bookings, eq(examinationSessions.bookingId, bookings.id))
        .orderBy(desc(examinationSessions.createdAt))
        .limit(limit)
        .offset(offset);

    // For each session, get diagnosis from medical record
    const sessionsWithDiagnosis = await Promise.all(
        sessions.map(async (session) => {
            const records = await db
                .select({ assessment: medicalRecords.assessment })
                .from(medicalRecords)
                .where(eq(medicalRecords.sessionId, session.sessionId))
                .limit(1);

            return {
                id: session.sessionId,
                bookingId: session.bookingId,
                patientName: session.patientName || 'Unknown',
                patientDisplayId: session.patientDisplayId || 'N/A',
                visitNumber: session.visitNumber,
                chiefComplaint: session.chiefComplaint,
                status: session.status,
                createdAt: session.createdAt,
                diagnosis: records[0]?.assessment || undefined
            };
        })
    );

    return sessionsWithDiagnosis;
}

/**
 * Get list of bookings with summary info for dashboard
 * Only shows bookings that are:
 * 1. Paid/Confirmed (ready for examination)
 * 2. Still valid (booking_time >= start of today)
 */
export async function getBookingsList(limit: number = 50, page: number = 1): Promise<BookingSummary[]> {
    const offset = (page - 1) * limit;

    // Calculate start of today for filtering
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Paid/confirmed status values - adjust if your system uses different values
    const paidStatuses = ['paid', 'confirmed', 'approved'];

    // Get bookings that are paid and still valid
    const bookingsList = await db
        .select()
        .from(bookings)
        .where(
            and(
                // Only show paid/confirmed bookings
                sql`${bookings.status} = ANY(ARRAY[${sql.join(paidStatuses.map(s => sql`${s}`), sql`, `)}])`,
                // Only show bookings with booking_time >= start of today
                gte(bookings.bookingTime, todayStart)
            )
        )
        .orderBy(desc(bookings.bookingTime))
        .limit(limit)
        .offset(offset);

    // For each booking, check if there's an associated session
    const bookingsWithSummary = await Promise.all(
        bookingsList.map(async (booking) => {
            // Check for existing session linked to this booking
            const session = await db
                .select({
                    id: examinationSessions.id,
                    status: examinationSessions.status,
                })
                .from(examinationSessions)
                .where(eq(examinationSessions.bookingId, booking.id))
                .orderBy(desc(examinationSessions.createdAt))
                .limit(1);

            return {
                id: booking.id,
                displayId: booking.displayId,
                patientName: booking.patientName,
                patientPhone: booking.patientPhone,
                age: booking.age,
                gender: booking.gender,
                symptoms: booking.symptoms,
                bookingTime: booking.bookingTime,
                status: booking.status,
                hasSession: session.length > 0,
                sessionStatus: session[0]?.status || null,
            };
        })
    );

    return bookingsWithSummary;
}

// Keep old function name for backwards compatibility
export const getPatientsList = getBookingsList;
