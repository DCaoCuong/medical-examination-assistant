'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PatientSearchModal from '@/components/PatientSearchModal';
import PatientFormModal from '@/components/PatientFormModal';
import { Search, UserPlus, TrendingUp, Users, Calendar, Activity, Stethoscope, Trash2, Phone, Clock } from 'lucide-react';

interface DashboardStats {
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

interface BookingSummary {
    id: string;
    displayId: string | null;
    patientName: string;
    patientPhone: string;
    age: number | null;
    gender: string | null;
    symptoms: string | null;
    bookingTime: string;
    status: string | null;
    hasSession: boolean;
    sessionStatus: string | null;
}

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [bookings, setBookings] = useState<BookingSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPatientSearch, setShowPatientSearch] = useState(false);
    const [showPatientForm, setShowPatientForm] = useState(false);
    const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboardData();

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowPatientSearch(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/dashboard/stats?limit=50');
            const data = await res.json();

            if (data.success) {
                setStats(data.stats);
                setBookings(data.bookings || data.patients || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewPatient = () => {
        setShowPatientForm(true);
    };

    const handleSearch = () => {
        setShowPatientSearch(true);
    };

    const handlePatientCreated = (patientId: string) => {
        setShowPatientForm(false);
        fetchDashboardData();
        router.push(`/examination?bookingId=${patientId}`);
    };

    const handlePatientSelected = (patientId: string, displayId: string) => {
        setShowPatientSearch(false);
        router.push(`/examination?bookingId=${patientId}`);
    };

    const handleQuickExam = (bookingId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/examination?bookingId=${bookingId}`);
    };

    const handleDeleteBooking = async (bookingId: string, displayId: string | null, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!confirm(`Xóa lịch khám ${displayId || bookingId}? Điều này sẽ xóa vĩnh viễn lịch đặt và phiên khám liên quan.`)) {
            return;
        }

        setDeletingBookingId(bookingId);

        try {
            const res = await fetch(`/api/booking/${bookingId}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (data.success) {
                fetchDashboardData();
                alert('Xóa lịch khám thành công!');
            } else {
                alert('Lỗi: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
            alert('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setDeletingBookingId(null);
        }
    };

    const handleRowClick = (bookingId: string) => {
        router.push(`/examination?bookingId=${bookingId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                        <p className="text-slate-600 mt-1">Tổng quan hệ thống quản lý khám bệnh</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={handleSearch} className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Tìm kiếm
                            <span className="ml-2 text-xs bg-white/50 px-2 py-1 rounded font-mono">Ctrl+K</span>
                        </Button>
                        <Button variant="primary" onClick={handleNewPatient} className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5" />
                            Đặt lịch mới
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={<Activity className="w-8 h-8 text-sky-600" />} label="Hôm nay" value={stats.today.totalSessions} subtext={`${stats.today.completedSessions} hoàn thành`} color="sky" />
                        <StatCard icon={<Calendar className="w-8 h-8 text-teal-600" />} label="Tuần này" value={stats.thisWeek.totalSessions} subtext={`${stats.thisWeek.newBookings} booking mới`} color="teal" />
                        <StatCard icon={<TrendingUp className="w-8 h-8 text-emerald-600" />} label="Tháng này" value={stats.thisMonth.totalSessions} subtext={`${stats.thisMonth.newBookings} booking mới`} color="emerald" />
                        <StatCard icon={<Users className="w-8 h-8 text-indigo-600" />} label="Tổng booking" value={stats.total.bookings} subtext={`${stats.total.sessions} lần khám`} color="indigo" />
                    </div>
                )}

                {/* Bookings List */}
                <Card variant="elevated" padding="none" className="animate-fade-in">
                    <div className="p-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">📅 Danh sách lịch khám</h3>
                        <p className="text-sm text-slate-600 mt-1">Click vào để bắt đầu khám bệnh</p>
                    </div>
                    <div className="overflow-x-auto">
                        {bookings.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4 opacity-40">📅</div>
                                <p className="text-slate-400 font-medium">Chưa có lịch khám nào</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Mã lịch</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Tên bệnh nhân</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Tuổi/Giới tính</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">SĐT</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Thời gian đặt</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Trạng thái</th>
                                        <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map((booking, idx) => (
                                        <tr
                                            key={booking.id}
                                            className="border-b border-slate-100 hover:bg-sky-50/50 transition cursor-pointer"
                                            onClick={() => handleRowClick(booking.id)}
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                        >
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm font-bold text-sky-600">{booking.displayId || booking.id.slice(0, 8)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">{booking.patientName}</div>
                                                {booking.symptoms && (
                                                    <div className="text-xs text-slate-500 mt-1 truncate max-w-xs">{booking.symptoms}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {booking.age ? `${booking.age} tuổi` : 'N/A'} / {booking.gender || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-slate-600">
                                                    <Phone className="w-3 h-3" />
                                                    {booking.patientPhone}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-sm text-slate-500">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(booking.bookingTime).toLocaleDateString('vi-VN')}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {new Date(booking.bookingTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <BookingStatusBadge
                                                    status={booking.status}
                                                    hasSession={booking.hasSession}
                                                    sessionStatus={booking.sessionStatus}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 justify-center">
                                                    <Button
                                                        variant="primary"
                                                        onClick={(e) => handleQuickExam(booking.id, e)}
                                                        className="px-3 py-2 text-xs flex items-center gap-1"
                                                        title="Bắt đầu khám"
                                                    >
                                                        <Stethoscope className="w-4 h-4" />
                                                        Khám
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        onClick={(e) => handleDeleteBooking(booking.id, booking.displayId, e)}
                                                        className="px-3 py-2 text-xs flex items-center gap-1"
                                                        disabled={deletingBookingId === booking.id}
                                                        title="Xóa lịch khám"
                                                    >
                                                        {deletingBookingId === booking.id ? (
                                                            <span className="animate-spin">⏳</span>
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                        Xóa
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>

            {/* Modals */}
            {showPatientSearch && <PatientSearchModal onClose={() => setShowPatientSearch(false)} onPatientSelect={handlePatientSelected} />}
            {showPatientForm && <PatientFormModal onClose={() => setShowPatientForm(false)} onPatientCreated={handlePatientCreated} />}
        </div>
    );
}

// StatCard Component
function StatCard({ icon, label, value, subtext, color }: { icon: React.ReactNode; label: string; value: number; subtext: string; color: string }) {
    const colorClasses = {
        sky: 'from-sky-50 to-sky-100 border-sky-200',
        teal: 'from-teal-50 to-teal-100 border-teal-200',
        emerald: 'from-emerald-50 to-emerald-100 border-emerald-200',
        indigo: 'from-indigo-50 to-indigo-100 border-indigo-200',
    };

    return (
        <Card variant="elevated" className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} border`}>
            <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">{icon}</div>
                <div className="flex-1">
                    <p className="text-sm text-slate-600 font-medium">{label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
                    <p className="text-xs text-slate-500 mt-1">{subtext}</p>
                </div>
            </div>
        </Card>
    );
}

// BookingStatusBadge Component
function BookingStatusBadge({ status, hasSession, sessionStatus }: { status: string | null; hasSession: boolean; sessionStatus: string | null }) {
    // Priority: session status > booking status
    if (hasSession && sessionStatus) {
        const sessionConfig = {
            'completed': { label: 'Hoàn thành', variant: 'success' },
            'active': { label: 'Đang khám', variant: 'warning' },
            'draft': { label: 'Nháp', variant: 'default' },
        };
        const config = sessionConfig[sessionStatus as keyof typeof sessionConfig] || { label: sessionStatus, variant: 'default' };
        return <Badge variant={config.variant as any}>{config.label}</Badge>;
    }

    // Booking status
    const bookingConfig = {
        'pending': { label: 'Chờ xác nhận', variant: 'default' },
        'confirmed': { label: 'Đã xác nhận', variant: 'info' },
        'in_progress': { label: 'Đang khám', variant: 'warning' },
        'completed': { label: 'Hoàn thành', variant: 'success' },
        'cancelled': { label: 'Đã hủy', variant: 'danger' },
    };

    const config = bookingConfig[status as keyof typeof bookingConfig] || { label: status || 'Chưa khám', variant: 'default' };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
}