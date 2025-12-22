'use client';
import { useState, useRef, useCallback } from 'react';

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

export default function STTPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false); // STT loading
  const [analyzing, setAnalyzing] = useState(false); // Agent loading
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [fullText, setFullText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'soap' | 'advice' | 'icd'>('soap');

  const [serviceStatus, setServiceStatus] = useState<'checking' | 'ready' | 'error'>('checking');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check service status
  const checkServiceStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/stt');
      const data = await res.json();
      if (data.services?.groq_stt === 'configured') {
        setServiceStatus('ready');
      } else {
        setServiceStatus('error');
      }
    } catch {
      setServiceStatus('error');
    }
  }, []);

  useState(() => {
    checkServiceStatus();
  });

  const startRecording = async () => {
    setAnalysisResult(null); // Reset prev analysis
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
      });

      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        await sendToSTT(audioBlob);
        chunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert("Vui lòng cấp quyền micro!");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  };

  const sendToSTT = async (blob: Blob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', blob);

    try {
      const res = await fetch('/api/stt', { method: 'POST', body: formData });
      const data: STTResponse = await res.json();

      if (data.success) {
        setTranscripts(data.segments);
        setFullText(data.raw_text);
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi xử lý audio!");
    } finally {
      setLoading(false);
    }
  };

  const runDeepAnalysis = async () => {
    if (!fullText) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: fullText })
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.data);
      } else {
        alert("Lỗi phân tích: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Không thể kết nối tới Agent Orchestrator");
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper for styles
  const getSpeakerStyle = (role: string) => {
    const normalizedRole = role.toLowerCase().trim();
    if (normalizedRole.includes('bác sĩ') || normalizedRole === 'doctor') {
      return { label: '👨‍⚕️ Bác sĩ', bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50', borderColor: 'border-blue-500', textColor: 'text-blue-800', labelBg: 'bg-blue-100' };
    } else if (normalizedRole.includes('bệnh nhân') || normalizedRole === 'patient') {
      return { label: '🧑 Bệnh nhân', bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50', borderColor: 'border-green-500', textColor: 'text-green-800', labelBg: 'bg-green-100' };
    }
    return { label: '💬 ' + role, bgColor: 'bg-gray-50', borderColor: 'border-gray-400', textColor: 'text-gray-700', labelBg: 'bg-gray-100' };
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="p-8 max-w-6xl mx-auto">

        {/* Header */}
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
              MEA - Medical Assistant
            </h1>
            <p className="text-gray-500">Trợ lý y khoa thông minh (Multi-Agent System)</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${serviceStatus === 'ready' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {serviceStatus === 'ready' ? 'System Ready' : 'Service Error'}
          </div>
        </header>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          {!isRecording ? (
            <button onClick={startRecording} disabled={loading || analyzing}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition shadow-lg flex items-center gap-2 font-bold disabled:opacity-50">
              🎙️ Bắt đầu khám
            </button>
          ) : (
            <button onClick={stopRecording}
              className="bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition shadow-lg flex items-center gap-2 font-bold">
              ⏹️ Dừng & Gỡ băng
            </button>
          )}

          {transcripts.length > 0 && !isRecording && (
            <button onClick={runDeepAnalysis} disabled={analyzing}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition shadow-lg flex items-center gap-2 font-bold disabled:opacity-50">
              {analyzing ? '⏳ Agents đang làm việc...' : '🧠 Phân tích chuyên sâu (AI Agents)'}
            </button>
          )}
        </div>

        {/* Loading States */}
        {loading && <div className="p-4 bg-blue-50 text-blue-700 rounded-xl mb-6 animate-pulse">📝 Đang chuyển đổi giọng nói thành văn bản...</div>}
        {analyzing && (
          <div className="p-6 bg-purple-50 border border-purple-200 rounded-xl mb-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-semibold text-purple-800">Hệ thống Multi-Agent đang hoạt động:</span>
            </div>
            <div className="mt-2 text-sm text-purple-600 ml-8 space-y-1">
              <p>• Scribe Agent đang tóm tắt bệnh án SOAP...</p>
              <p>• Medical Expert đang tra cứu Knowledge Base (RAG)...</p>
              <p>• ICD-10 Agent đang gán mã bệnh lý...</p>
            </div>
          </div>
        )}

        {/* MAIN LAYOUT: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT: Transcript */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-fit">
            <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex justify-between">
              <span>📄 Chi tiết cuộc hội thoại</span>
              <span className="text-gray-400 font-normal text-sm">{transcripts.length} segments</span>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto space-y-4">
              {transcripts.length === 0 ? (
                <div className="text-center py-20 text-gray-400">Chưa có dữ liệu hội thoại</div>
              ) : (
                transcripts.map((seg, idx) => {
                  const style = getSpeakerStyle(seg.role);
                  return (
                    <div key={idx} className={`p-4 rounded-xl border-l-4 ${style.borderColor} ${style.bgColor}`}>
                      <div className="text-xs font-bold mb-1 opacity-70 {style.textColor}">{style.label}</div>
                      <div className="text-gray-800">{seg.clean_text}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Analysis Results */}
          <div className="space-y-6">
            {!analysisResult ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
                <div className="text-5xl mb-4">🩺</div>
                <h3 className="text-xl font-bold text-gray-700">Chưa có kết quả phân tích</h3>
                <p className="text-gray-500 mt-2">Nhấn nút "Phân tích chuyên sâu" để kích hoạt AI Agents.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                  <button onClick={() => setActiveTab('soap')}
                    className={`flex-1 py-3 font-bold text-sm ${activeTab === 'soap' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    📝 Bệnh án SOAP
                  </button>
                  <button onClick={() => setActiveTab('advice')}
                    className={`flex-1 py-3 font-bold text-sm ${activeTab === 'advice' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    💡 Gợi ý & RAG
                  </button>
                  <button onClick={() => setActiveTab('icd')}
                    className={`flex-1 py-3 font-bold text-sm ${activeTab === 'icd' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    🏷️ Mã ICD-10
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 min-h-[500px]">

                  {activeTab === 'soap' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="font-bold text-blue-700 block mb-1">Subjective (Bệnh sử):</span>
                        <p className="text-gray-700">{analysisResult.soap.subjective}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <span className="font-bold text-green-700 block mb-1">Objective (Thực thể):</span>
                        <p className="text-gray-700">{analysisResult.soap.objective}</p>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                        <span className="font-bold text-yellow-700 block mb-1">Assessment (Chẩn đoán):</span>
                        <p className="text-gray-700">{analysisResult.soap.assessment}</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <span className="font-bold text-red-700 block mb-1">Plan (Điều trị):</span>
                        <p className="text-gray-700 whitespace-pre-line">{analysisResult.soap.plan}</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'advice' && (
                    <div>
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                        {analysisResult.medicalAdvice}
                      </div>
                      {analysisResult.references.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Nguồn dữ liệu (RAG References):</p>
                          <div className="flex gap-2 flex-wrap">
                            {analysisResult.references.map((ref, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">
                                📚 {ref}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'icd' && (
                    <div>
                      <h4 className="font-bold text-gray-700 mb-4">Mã chẩn đoán đề xuất:</h4>
                      <div className="space-y-2">
                        {analysisResult.icdCodes.map((code, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100 hover:shadow-sm transition">
                            <span className="text-2xl">🏷️</span>
                            <span className="font-mono font-bold text-orange-800 text-lg">{code}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-8 italic text-center">
                        * Mã ICD-10 được gợi ý tự động bởi AI, vui lòng kiểm tra lại.
                      </p>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

        </div>

        <footer className="mt-12 text-center text-sm text-gray-400">
          Powered by LangGraph + Groq Llama 3 + Google Gemini Embeddings
        </footer>
      </div>
    </div>
  );
}