import { db, bookings } from '../db';
import { eq, desc, sql, ilike, or, gte, and } from 'drizzle-orm';

// ============= Types =============

export interface BookingSummary {
    id: string;
    displayId: string | null;
    patientName: string;
    patientPhone: string;
    gender: string | null;
    age: number | null;
    symptoms: string | null;
    bookingTime: Date;
    status: string | null;
    createdAt: Date | null;
}

export interface BookingDetail {
    id: string;
    displayId: string | null;
    userId: string | null;
    clinicId: string | null;
    serviceId: string | null;
    patientName: string;
    patientPhone: string;
    gender: string | null;
    age: number | null;
    symptoms: string | null;
    address: string | null;
    medicalHistory: string | null;
    allergies: string | null;
    bloodType: string | null;
    bookingTime: Date;
    doctorId: string | null;
    assignedBy: string | null;
    staffNote: string | null;
    status: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}

export interface BookingSearchResult {
    id: string;
    displayId: string | null;
    patientName: string;
    patientPhone: string;
    bookingTime: Date;
    status: string | null;
}

// ============= Booking Service Functions =============

/**
 * Get list of bookings for dashboard display
 * Ordered by booking_time descending (most recent first)
 */
export async function getBookingsList(
    limit: number = 50,
    page: number = 1
): Promise<BookingSummary[]> {
    const offset = (page - 1) * limit;

    const bookingsList = await db
        .select({
            id: bookings.id,
            displayId: bookings.displayId,
            patientName: bookings.patientName,
            patientPhone: bookings.patientPhone,
            gender: bookings.gender,
            age: bookings.age,
            symptoms: bookings.symptoms,
            bookingTime: bookings.bookingTime,
            status: bookings.status,
            createdAt: bookings.createdAt,
        })
        .from(bookings)
        .orderBy(desc(bookings.bookingTime))
        .limit(limit)
        .offset(offset);

    return bookingsList;
}

/**
 * Get booking by ID
 */
export async function getBookingById(bookingId: string): Promise<BookingDetail | null> {
    const result = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

    return result[0] ? (result[0] as BookingDetail) : null;
}

/**
 * Get booking by display ID (human-readable ID)
 */
export async function getBookingByDisplayId(displayId: string): Promise<BookingDetail | null> {
    const result = await db
        .select()
        .from(bookings)
        .where(eq(bookings.displayId, displayId))
        .limit(1);

    return result[0] ? (result[0] as BookingDetail) : null;
}

/**
 * Search bookings by patient name, phone, or display ID
 */
export async function searchBookings(
    query: string,
    options: { page?: number; limit?: number } = {}
): Promise<{ bookings: BookingSearchResult[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const searchPattern = `%${query}%`;

    const results = await db
        .select({
            id: bookings.id,
            displayId: bookings.displayId,
            patientName: bookings.patientName,
            patientPhone: bookings.patientPhone,
            bookingTime: bookings.bookingTime,
            status: bookings.status,
        })
        .from(bookings)
        .where(
            or(
                ilike(bookings.patientName, searchPattern),
                ilike(bookings.patientPhone, searchPattern),
                ilike(bookings.displayId, searchPattern)
            )
        )
        .orderBy(desc(bookings.bookingTime))
        .limit(limit)
        .offset(offset);

    // Get total count
    const countResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(bookings)
        .where(
            or(
                ilike(bookings.patientName, searchPattern),
                ilike(bookings.patientPhone, searchPattern),
                ilike(bookings.displayId, searchPattern)
            )
        );

    const total = countResult[0]?.count || 0;

    return {
        bookings: results,
        total,
    };
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
    bookingId: string,
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
): Promise<BookingDetail | null> {
    await db
        .update(bookings)
        .set({ status, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));

    return getBookingById(bookingId);
}

/**
 * Get booking statistics
 */
export async function getBookingsStats() {
    const now = new Date();

    // Calculate date boundaries
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's bookings
    const todayBookings = await db
        .select()
        .from(bookings)
        .where(gte(bookings.bookingTime, todayStart));

    const todayCompleted = todayBookings.filter(b => b.status === 'completed').length;
    const todayPending = todayBookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;

    // This week's bookings
    const weekBookings = await db
        .select()
        .from(bookings)
        .where(gte(bookings.bookingTime, weekStart));

    // New bookings this week
    const weekNewBookings = await db
        .select()
        .from(bookings)
        .where(gte(bookings.createdAt, weekStart));

    // This month's bookings
    const monthBookings = await db
        .select()
        .from(bookings)
        .where(gte(bookings.bookingTime, monthStart));

    // New bookings this month
    const monthNewBookings = await db
        .select()
        .from(bookings)
        .where(gte(bookings.createdAt, monthStart));

    // Total counts
    const totalBookingsResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(bookings);

    return {
        today: {
            totalBookings: todayBookings.length,
            completedBookings: todayCompleted,
            pendingBookings: todayPending,
        },
        thisWeek: {
            totalBookings: weekBookings.length,
            newBookings: weekNewBookings.length,
        },
        thisMonth: {
            totalBookings: monthBookings.length,
            newBookings: monthNewBookings.length,
        },
        total: {
            bookings: totalBookingsResult[0]?.count || 0,
        },
    };
}

/**
 * Get total bookings count
 */
export async function getTotalBookingsCount(): Promise<number> {
    const result = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(bookings);

    return result[0]?.count || 0;
}

/**
 * Delete a booking
 */
export async function deleteBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await db
            .delete(bookings)
            .where(eq(bookings.id, bookingId));

        return { success: true };
    } catch (error) {
        console.error('Error deleting booking:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
