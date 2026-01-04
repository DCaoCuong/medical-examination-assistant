'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ArrowLeft, Calendar, FileText, User, Phone, Clock, Stethoscope, AlertCircle } from 'lucide-react';

interface BookingInfo {
    id: string;
    displayId: string | null;
    patientName: string;
    patientPhone: string;
    age: number | null;
    gender: string | null;
    symptoms: string | null;
    address: string | null;
    medicalHistory: string | null;
    allergies: string | null;
    bloodType: string | null;
    bookingTime: string;
    status: string | null;
}

interface SessionInfo {
    id: string;
    visitNumber: number;
    status: string;
    createdAt: string;
}

interface MedicalRecordInfo {
    id: string;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
    icdCodes: string[];
    status: string;
    createdAt: string;
}

export default function BookingRecordPage() {
    const router = useRouter();
    const params = useParams();
    const bookingId = params.bookingId as string;

    const [booking, setBooking] = useState<BookingInfo | null>(null);
    const [session, setSession] = useState<SessionInfo | null>(null);
    const [medicalRecord, setMedicalRecord] = useState<MedicalRecordInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (bookingId) {
            fetchRecordData();
        }
    }, [bookingId]);

    const fetchRecordData = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(`/api/booking/${bookingId}/record`);
            const data = await res.json();

            if (data.success) {
                setBooking(data.data.booking);
                setSession(data.data.session);
                setMedicalRecord(data.data.medicalRecord);
            } else {
                setError(data.message || 'Không tìm thấy bệnh án');
            }
        } catch (err) {
            console.error('Error fetching record data:', err);
            setError('Lỗi khi tải dữ liệu bệnh án');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.push('/dashboard');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Đang tải bệnh án...</p>
                </div>
            </div>
        );
    }

    if (error || !booking || !medicalRecord) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 p-6">
                <div className="max-w-4xl mx-auto">
                    <Card variant="elevated" className="text-center py-12">
                        <div className="text-6xl mb-4 opacity-40">😞</div>
                        <p className="text-slate-600 text-lg mb-4">{error || 'Không tìm thấy bệnh án'}</p>
                        <Button variant="primary" onClick={handleBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Quay lại Dashboard
                        </Button>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="secondary" onClick={handleBack}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Bệnh án</h1>
                            <p className="text-slate-600 mt-1">
                                Mã lịch: <span className="font-mono font-bold text-sky-600">{booking.displayId || bookingId.slice(0, 8)}</span>
                            </p>
                        </div>
                    </div>
                    <Badge variant="success" className="px-4 py-2 text-sm">
                        ✅ Hoàn thành
                    </Badge>
                </div>

                {/* Patient Info Card */}
                <Card variant="elevated" className="bg-gradient-to-r from-sky-50 to-teal-50 border border-sky-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center">
                                    <User className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{booking.patientName}</h2>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Phone className="w-4 h-4" />
                                        <span>{booking.patientPhone}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-slate-500">Tuổi:</span>
                                    <p className="font-semibold text-slate-800">{booking.age ? `${booking.age} tuổi` : 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Giới tính:</span>
                                    <p className="font-semibold text-slate-800">{booking.gender || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-600">Ngày khám:</span>
                                <span className="font-semibold text-slate-800">
                                    {new Date(booking.bookingTime).toLocaleDateString('vi-VN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            {booking.symptoms && (
                                <div>
                                    <span className="text-slate-500">Triệu chứng ban đầu:</span>
                                    <p className="font-medium text-slate-800 mt-1">{booking.symptoms}</p>
                                </div>
                            )}
                            {booking.allergies && (
                                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                    <div>
                                        <span className="text-red-600 font-medium">Dị ứng:</span>
                                        <p className="text-red-700">{booking.allergies}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* SOAP Notes */}
                <Card variant="elevated" padding="none">
                    <div className="p-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Bệnh án SOAP
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Lần khám thứ {session?.visitNumber || 1} • {new Date(medicalRecord.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Subjective */}
                        <SOAPSection
                            title="S - Triệu chứng (Subjective)"
                            content={medicalRecord.subjective}
                            color="sky"
                            icon="🗣️"
                        />

                        {/* Objective */}
                        <SOAPSection
                            title="O - Khám lâm sàng (Objective)"
                            content={medicalRecord.objective}
                            color="teal"
                            icon="🔬"
                        />

                        {/* Assessment */}
                        <SOAPSection
                            title="A - Chẩn đoán (Assessment)"
                            content={medicalRecord.assessment}
                            color="amber"
                            icon="📋"
                        />

                        {/* ICD-10 Codes */}
                        {medicalRecord.icdCodes && medicalRecord.icdCodes.length > 0 && (
                            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                                <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4" />
                                    Mã ICD-10
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {medicalRecord.icdCodes.map((code, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1.5 bg-white text-indigo-700 rounded-full text-sm font-mono font-semibold border border-indigo-200"
                                        >
                                            {code}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Plan */}
                        <SOAPSection
                            title="P - Kế hoạch điều trị (Plan)"
                            content={medicalRecord.plan}
                            color="emerald"
                            icon="💊"
                        />
                    </div>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4">
                    <Button variant="secondary" onClick={handleBack} className="px-8">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
}

// SOAP Section Component
function SOAPSection({ title, content, color, icon }: {
    title: string;
    content: string | null;
    color: 'sky' | 'teal' | 'amber' | 'emerald';
    icon: string;
}) {
    const colorClasses = {
        sky: 'bg-sky-50 border-sky-200 text-sky-800',
        teal: 'bg-teal-50 border-teal-200 text-teal-800',
        amber: 'bg-amber-50 border-amber-200 text-amber-800',
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    };

    if (!content) {
        return null;
    }

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
            <h4 className="font-bold mb-2 flex items-center gap-2">
                <span>{icon}</span>
                {title}
            </h4>
            <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {content}
            </div>
        </div>
    );
}
