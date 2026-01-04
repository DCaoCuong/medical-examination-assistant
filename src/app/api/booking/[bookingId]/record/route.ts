import { NextRequest, NextResponse } from 'next/server';
import { getMedicalRecordByBookingId } from '@/lib/services/sessionService';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> }
) {
    try {
        const { bookingId } = await params;

        if (!bookingId) {
            return NextResponse.json(
                { success: false, message: 'Booking ID is required' },
                { status: 400 }
            );
        }

        const data = await getMedicalRecordByBookingId(bookingId);

        if (!data) {
            return NextResponse.json(
                { success: false, message: 'Không tìm thấy bệnh án cho booking này' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                booking: data.booking,
                session: data.session,
                medicalRecord: {
                    ...data.medicalRecord,
                    icdCodes: data.medicalRecord.icdCodes || [],
                }
            }
        });

    } catch (error) {
        console.error('Error fetching medical record:', error);
        return NextResponse.json(
            { success: false, message: 'Lỗi server khi lấy bệnh án' },
            { status: 500 }
        );
    }
}
