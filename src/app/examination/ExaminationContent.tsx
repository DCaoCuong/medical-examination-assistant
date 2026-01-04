'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import MatchingEngine from '@/components/MatchingEngine';
import SessionInitForm from '@/components/SessionInitForm';
import MedicalRecordReview, { type MedicalRecordData } from '@/components/MedicalRecordReview';
import { Button, Card, Badge, Textarea, useToast } from '@/components/ui';
import type { Session } from '@/lib/services/sessionService';
import { ChevronDown, Check, Loader2, Mic, Edit3, Sparkles, ChevronRight } from 'lucide-react';

interface TranscriptSegment {
    start: number;
    end: number;
    role: string;
    raw_text: string;
    clean_text: string;
}

interface STTResponse {
    success: boolean;
    segments: TranscriptSegment[];
    raw_text: string;
    num_speakers: number;
}

interface AnalysisResult {
    soap: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    };
    icdCodes: string[];
    medicalAdvice: string;
    references: string[];
}

// Input mode: 'recording' (use STT) or 'manual' (type directly)
type InputMode = 'choose' | 'recording' | 'manual';

export default function ExaminationPage() {
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');
    const patientId = searchParams.get('patientId'); // Legacy support

    // Session Management State  
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [medicalRecordSaved, setMedicalRecordSaved] = useState(false);
    const [isCreatingSession, setIsCreatingSession] = useState(false);

    // Input Mode State - NEW: allows doctor to choose between recording or manual input
    const [inputMode, setInputMode] = useState<InputMode>('choose');

    // Manual Input State - NEW: for direct text input
    const [manualTranscript, setManualTranscript] = useState('');

    // Workflow States
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
    const [fullText, setFullText] = useState("");
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [showMatchingEngine, setShowMatchingEngine] = useState(false);
    const [medicalRecordId, setMedicalRecordId] = useState<string | null>(null);

    // Toast notifications
    const toast = useToast();

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Auto-create session if bookingId or patientId provided
    useEffect(() => {
        const id = bookingId || patientId;
        if (id && !currentSession && !isCreatingSession) {
            createSessionForBookingOrPatient(id);
        }
    }, [bookingId, patientId]);

    // Keyboard shortcut: Space to toggle recording (only in recording mode)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if not focused on input/textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Only work in recording mode
            if (inputMode === 'recording' && e.code === 'Space' && transcripts.length === 0 && !loading) {
                e.preventDefault();
                if (isRecording) {
                    stopRecording();
                } else {
                    startRecording();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isRecording, transcripts.length, loading, inputMode]);

    // Create session for a booking or patient
    const createSessionForBookingOrPatient = async (id: string) => {
        setIsCreatingSession(true);
        try {
            // Determine if this is a bookingId or patientId based on URL param
            const requestBody = bookingId
                ? { bookingId: id, chiefComplaint: '' }
                : { patientId: id, chiefComplaint: '' };

            const response = await fetch('/api/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            if (result.success) {
                setCurrentSession(result.data);
            } else {
                toast.error('Không thể tạo phiên khám: ' + result.message);
            }
        } catch (error) {
            console.error('Error creating session:', error);
            toast.error('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setIsCreatingSession(false);
        }
    };

    const handleSessionCreated = (session: Session) => {
        setCurrentSession(session);
    };

    // Recording functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                sendAudioToSTT(audioBlob);
            };
            setIsRecording(false);
        }
    };

    const sendAudioToSTT = async (audioBlob: Blob) => {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');

        try {
            const response = await fetch('/api/stt', {
                method: 'POST',
                body: formData,
            });

            const data: STTResponse = await response.json();

            if (data.success) {
                setTranscripts(data.segments);
                setFullText(data.raw_text);
                // Start AI analysis in background - doctor can continue working
                analyzeTranscript(data.raw_text);
            } else {
                toast.error('Lỗi xử lý âm thanh. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error sending audio to STT:', error);
            toast.error('Lỗi kết nối với server. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // Manual mode: submit text for analysis
    const handleManualSubmit = () => {
        if (!manualTranscript.trim()) {
            toast.warning('Vui lòng nhập nội dung hội thoại');
            return;
        }

        setFullText(manualTranscript);
        // Create a simple transcript segment for consistency
        setTranscripts([{
            start: 0,
            end: 0,
            role: 'Ghi chú',
            raw_text: manualTranscript,
            clean_text: manualTranscript
        }]);

        // Start AI analysis in background
        analyzeTranscript(manualTranscript);
    };

    const analyzeTranscript = async (text: string) => {
        setAnalyzing(true);
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: text }),
            });

            const data = await response.json();

            if (data.success) {
                setAnalysisResult(data.data);
            } else {
                toast.error('Lỗi phân tích. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error analyzing transcript:', error);
            toast.error('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleMedicalRecordSave = async (data: MedicalRecordData, isFinal: boolean) => {
        if (!currentSession) return;

        try {
            const response = await fetch('/api/medical-record/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSession.id,
                    ...data,
                    status: isFinal ? 'final' : 'draft',
                }),
            });

            const result = await response.json();

            if (result.success) {
                setMedicalRecordId(result.data.id);
                setMedicalRecordSaved(true);

                if (isFinal) {
                    toast.success('Bệnh án đã được lưu và hoàn tất!');
                } else {
                    toast.success('Bản nháp đã được lưu!');
                }
            }
        } catch (error) {
            console.error('Error saving medical record:', error);
            toast.error('Lỗi lưu bệnh án. Vui lòng thử lại.');
        }
    };

    const handleShowComparison = () => {
        setShowMatchingEngine(true);
    };

    // Apply AI suggestion to manual input
    const applyAISuggestion = () => {
        if (analysisResult) {
            // Format the SOAP note as text
            const soapText = `
SUBJECTIVE (Bệnh sử):
${analysisResult.soap.subjective}

OBJECTIVE (Khám lâm sàng):
${analysisResult.soap.objective}

ASSESSMENT (Chẩn đoán):
${analysisResult.soap.assessment}

PLAN (Điều trị):
${analysisResult.soap.plan}
            `.trim();

            setManualTranscript(soapText);
        }
    };

    // Loading state for session creation
    if (isCreatingSession) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Đang khởi tạo phiên khám...</p>
                </div>
            </div>
        );
    }

    // Show session init form if no session
    if (!currentSession) {
        return <SessionInitForm onSessionCreated={handleSessionCreated} />;
    }

    // Main examination interface - Parallel Workflow Layout
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-teal-50/30 pb-20">
            <div className="p-6 md:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                        Phiên khám bệnh
                    </h1>
                    <p className="text-slate-600 text-lg">Session ID: {currentSession.id}</p>
                </header>

                {/* Input Mode Selection - NEW */}
                {inputMode === 'choose' && (
                    <Card variant="elevated" className="mb-6 p-8">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Chọn phương thức nhập liệu</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                            {/* Recording Mode */}
                            <button
                                onClick={() => setInputMode('recording')}
                                className="group p-8 border-2 border-slate-200 rounded-2xl hover:border-sky-500 hover:bg-sky-50 transition-all text-left"
                            >
                                <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-sky-200 transition">
                                    <Mic className="w-8 h-8 text-sky-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">🎙️ Ghi âm hội thoại</h3>
                                <p className="text-slate-600 text-sm">
                                    Ghi âm cuộc trò chuyện với bệnh nhân, AI sẽ tự động chuyển đổi thành văn bản và phân tích
                                </p>
                                <div className="mt-4 text-sky-600 font-medium flex items-center gap-1">
                                    Chọn phương thức này <ChevronRight className="w-4 h-4" />
                                </div>
                            </button>

                            {/* Manual Mode - NEW */}
                            <button
                                onClick={() => setInputMode('manual')}
                                className="group p-8 border-2 border-slate-200 rounded-2xl hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
                            >
                                <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-teal-200 transition">
                                    <Edit3 className="w-8 h-8 text-teal-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">✍️ Nhập thủ công</h3>
                                <p className="text-slate-600 text-sm">
                                    Nhập trực tiếp nội dung khám bệnh, bác sĩ có thể ghi chú song song với AI hỗ trợ
                                </p>
                                <div className="mt-4 text-teal-600 font-medium flex items-center gap-1">
                                    Chọn phương thức này <ChevronRight className="w-4 h-4" />
                                </div>
                            </button>
                        </div>
                    </Card>
                )}

                {/* Main Content Area - Parallel Layout */}
                {inputMode !== 'choose' && (
                    <div className="space-y-6">
                        {/* Left Column: Main Editing Area */}
                        <div className="flex-1 space-y-6">
                            {/* Back to mode selection */}
                            <button
                                onClick={() => {
                                    setInputMode('choose');
                                    setTranscripts([]);
                                    setManualTranscript('');
                                    setAnalysisResult(null);
                                }}
                                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                            >
                                ← Đổi phương thức nhập liệu
                            </button>

                            {/* Recording Mode Interface */}
                            {inputMode === 'recording' && (
                                <>
                                    {/* Step 1: Recording Section */}
                                    <StepCard
                                        stepNumber={1}
                                        title="Ghi âm hội thoại"
                                        status={transcripts.length > 0 ? 'completed' : isRecording ? 'active' : 'pending'}
                                        isExpanded={transcripts.length === 0}
                                    >
                                        <div className="text-center py-8">
                                            {!isRecording && transcripts.length === 0 && (
                                                <div className="space-y-4">
                                                    <Button
                                                        variant="primary"
                                                        onClick={startRecording}
                                                        className="px-8 py-4 text-lg"
                                                    >
                                                        🎙️ Bắt đầu ghi âm
                                                    </Button>
                                                    <div className="text-sm text-slate-500">
                                                        <kbd className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded font-mono text-slate-700 shadow-sm">
                                                            Space
                                                        </kbd>
                                                        <span className="ml-2">để bắt đầu/dừng ghi âm</span>
                                                    </div>
                                                </div>
                                            )}
                                            {isRecording && (
                                                <div className="space-y-4">
                                                    <Button
                                                        variant="danger"
                                                        onClick={stopRecording}
                                                        className="px-8 py-4 text-lg animate-pulse"
                                                    >
                                                        ⏹️ Dừng ghi âm
                                                    </Button>
                                                    <div className="text-sm text-red-600 font-medium">
                                                        <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
                                                        Đang ghi âm... Nhấn Space hoặc nút để dừng
                                                    </div>
                                                </div>
                                            )}
                                            {loading && (
                                                <div className="flex items-center justify-center gap-2 text-slate-600">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span>Đang xử lý âm thanh...</span>
                                                </div>
                                            )}
                                        </div>
                                    </StepCard>

                                    {/* Step 2: Transcripts */}
                                    {transcripts.length > 0 && (
                                        <StepCard
                                            stepNumber={2}
                                            title="Hội thoại (Speech-to-Text)"
                                            status={analysisResult ? 'completed' : analyzing ? 'active' : 'completed'}
                                            isExpanded={!analysisResult}
                                        >
                                            {analyzing && (
                                                <div className="flex items-center gap-2 text-sky-600 mb-4">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span className="font-medium">Đang phân tích bằng AI... Bạn có thể tiếp tục làm việc</span>
                                                </div>
                                            )}
                                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                                {transcripts.map((seg, idx) => {
                                                    const style = seg.role === 'Bác sĩ'
                                                        ? { bgColor: 'bg-sky-50', borderColor: 'border-sky-400', textColor: 'text-sky-700', label: '👨‍⚕️ Bác sĩ' }
                                                        : seg.role === 'Ghi chú'
                                                            ? { bgColor: 'bg-slate-50', borderColor: 'border-slate-400', textColor: 'text-slate-700', label: '📝 Ghi chú' }
                                                            : { bgColor: 'bg-teal-50', borderColor: 'border-teal-400', textColor: 'text-teal-700', label: '🧑 Bệnh nhân' };

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`p-4 rounded-xl border-l-4 ${style.borderColor} ${style.bgColor} transition-all hover:shadow-md`}
                                                        >
                                                            <div className={`text-xs font-bold mb-2 ${style.textColor}`}>{style.label}</div>
                                                            <div className="text-slate-800 leading-relaxed whitespace-pre-wrap">{seg.clean_text}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </StepCard>
                                    )}
                                </>
                            )}

                            {/* Manual Mode Interface - NEW */}
                            {inputMode === 'manual' && (
                                <StepCard
                                    stepNumber={1}
                                    title="Nhập thủ công"
                                    status={transcripts.length > 0 ? 'completed' : 'active'}
                                    isExpanded={true}
                                >
                                    <div className="space-y-6">
                                        <Textarea
                                            label="Nhập nội dung hội thoại hoặc ghi chú khám bệnh. Bạn có thể gõ song song trong khi AI phân tích."
                                            placeholder={`Nhập nội dung hội thoại với bệnh nhân, triệu chứng, khám lâm sàng..
Ví dụ:
- Bệnh nhân đến khám vì đau bụng vùng thượng vị 3 ngày
- Đau âm ỉ, tăng khi đói, giảm sau ăn
- Khám: Bụng mềm, ấn đau thượng vị...`}
                                            value={manualTranscript}
                                            onChange={(e) => setManualTranscript(e.target.value)}
                                            rows={12}
                                            className="font-mono text-sm"
                                        />

                                        <div className="flex gap-3">
                                            <Button
                                                variant="primary"
                                                onClick={handleManualSubmit}
                                                disabled={!manualTranscript.trim() || analyzing}
                                                className="flex-1"
                                            >
                                                {analyzing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        Đang phân tích...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4 mr-2" />
                                                        Phân tích bằng AI
                                                    </>
                                                )}
                                            </Button>

                                            {/* {analysisResult && (
                                                <Button
                                                    variant="secondary"
                                                    onClick={applyAISuggestion}
                                                    title="Áp dụng gợi ý AI vào ô nhập liệu"
                                                >
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    Dùng gợi ý AI
                                                </Button>
                                            )} */}
                                        </div>

                                        {analyzing && (
                                            <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
                                                <div className="flex items-center gap-2 text-sky-700">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span className="font-medium">AI đang phân tích...</span>
                                                </div>
                                                <p className="text-sm text-sky-600 mt-1">
                                                    Bạn có thể tiếp tục chỉnh sửa nội dung hoặc chờ kết quả
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </StepCard>
                            )}

                            {/* Step 3: AI Analysis & Medical Record Review */}
                            {analysisResult && (
                                <StepCard
                                    stepNumber={inputMode === 'manual' ? 2 : 3}
                                    title="Kết quả phân tích từ Medical Assistant"
                                    status={showMatchingEngine ? 'completed' : 'active'}
                                    isExpanded={!showMatchingEngine}
                                >
                                    <MedicalRecordReview
                                        sessionId={currentSession.id}
                                        aiResults={{
                                            soap: analysisResult.soap,
                                            icdCodes: analysisResult.icdCodes.map(code => {
                                                const [codeNum, ...descParts] = code.split(' - ');
                                                return { code: codeNum, description: descParts.join(' - ') || codeNum };
                                            }),
                                            medicalAdvice: analysisResult.medicalAdvice,
                                        }}
                                        onSave={handleMedicalRecordSave}
                                        onComparison={handleShowComparison}
                                        readOnly={true}
                                        onProceed={() => setShowMatchingEngine(true)}
                                    />
                                </StepCard>
                            )}

                            {/* Step 4: Comparison (AI vs Doctor) */}
                            {showMatchingEngine && analysisResult && (
                                <StepCard
                                    stepNumber={inputMode === 'manual' ? 3 : 4}
                                    title="So sánh gợi ý từ Medical Assistant với Bác sĩ"
                                    status="active"
                                    isExpanded={true}
                                >
                                    <MatchingEngine
                                        sessionId={currentSession.id}
                                        medicalRecordId={medicalRecordId || undefined}
                                        aiSoap={analysisResult.soap}
                                        aiIcd={analysisResult.icdCodes}
                                        medicalAdvice={analysisResult.medicalAdvice}
                                    />
                                </StepCard>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}



// Step Card Component
function StepCard({
    stepNumber,
    title,
    status,
    isExpanded,
    children
}: {
    stepNumber: number;
    title: string;
    status: 'pending' | 'active' | 'completed';
    isExpanded: boolean;
    children: React.ReactNode;
}) {
    const [expanded, setExpanded] = useState(isExpanded);

    useEffect(() => {
        setExpanded(isExpanded);
    }, [isExpanded]);

    const statusConfig = {
        pending: { bg: 'bg-slate-100', border: 'border-slate-300', icon: '⏳', text: 'Chờ xử lý' },
        active: { bg: 'bg-sky-50', border: 'border-sky-400', icon: '🔄', text: 'Đang xử lý' },
        completed: { bg: 'bg-green-50', border: 'border-green-400', icon: '✅', text: 'Hoàn thành' },
    };

    const config = statusConfig[status];

    return (
        <Card variant="elevated" padding="none" className={`border-2 ${config.border} ${config.bg} transition-all`}>
            {/* Header */}
            <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/50 transition"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-slate-700">
                        {stepNumber}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                        <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                            <span>{config.icon}</span>
                            <span>{config.text}</span>
                        </p>
                    </div>
                </div>
                <ChevronDown className={`w-6 h-6 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>

            {/* Content */}
            {expanded && (
                <div className="p-6 pt-0 border-t border-slate-200 bg-white">
                    {children}
                </div>
            )}
        </Card>
    );
}
