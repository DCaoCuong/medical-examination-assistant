import { NextResponse } from 'next/server';
import { deleteBooking, getBookingById } from '@/lib/services/bookingService';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ bookingId: string }> }
) {
    try {
        const { bookingId } = await params;
        const booking = await getBookingById(bookingId);

        if (!booking) {
            return NextResponse.json(
                { success: false, message: 'Booking not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: booking
        });
    } catch (error) {
        console.error('Error fetching booking:', error);
        return NextResponse.json(
            { success: false, message: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ bookingId: string }> }
) {
    try {
        const { bookingId } = await params;

        // Check if booking exists
        const booking = await getBookingById(bookingId);
        if (!booking) {
            return NextResponse.json(
                { success: false, message: 'Booking not found' },
                { status: 404 }
            );
        }

        // Delete the booking
        const result = await deleteBooking(bookingId);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Booking deleted successfully'
            });
        } else {
            return NextResponse.json(
                { success: false, message: result.error || 'Failed to delete booking' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        return NextResponse.json(
            { success: false, message: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
