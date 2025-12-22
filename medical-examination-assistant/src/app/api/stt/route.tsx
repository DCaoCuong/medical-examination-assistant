import { NextRequest, NextResponse } from 'next/server';
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const DIARIZATION_SERVICE_URL = process.env.DIARIZATION_SERVICE_URL || 'http://localhost:8001';

interface DiarizationSegment {
    start: number;
    end: number;
    speaker: string;
    role?: string;
}

interface DiarizationResponse {
    speakers: DiarizationSegment[];
    num_speakers: number;
    duration: number;
    speaker_mapping?: Record<string, string>;
}

interface TranscriptSegment {
    start: number;
    end: number;
    text: string;
}

interface ProcessedSegment {
    start: number;
    end: number;
    speaker: string;
    role: string;
    raw_text: string;
    clean_text: string;
}

/**
 * Gọi Groq Whisper API để chuyển audio thành text
 */
async function transcribeWithGroq(audioBlob: Blob): Promise<{ text: string; segments: TranscriptSegment[] }> {
    const groqFormData = new FormData();
    groqFormData.append('file', audioBlob, 'recording.wav');
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('language', 'vi');
    groqFormData.append('response_format', 'verbose_json');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        body: groqFormData,
    });

    if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
        text: data.text || '',
        segments: data.segments || []
    };
}

/**
 * Gọi Python Diarization Service để phân biệt người nói
 */
async function getDiarization(audioBlob: Blob): Promise<DiarizationResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');

    const url = `${DIARIZATION_SERVICE_URL}/diarize-with-mapping`;
    console.log(`🎤 Calling diarization service at: ${url}`);

    try {
        // Add timeout of 60 seconds for diarization
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`Diarization service error (${response.status}): ${errorText}`);
            return { speakers: [], num_speakers: 0, duration: 0 };
        }

        const result = await response.json();
        console.log(`Diarization success: ${result.num_speakers} speakers found`);
        return result;
    } catch (error) {
        console.warn('Diarization service error:', error);
        // Fallback: return empty diarization
        return { speakers: [], num_speakers: 0, duration: 0 };
    }
}

/**
 * Merge transcript segments với diarization results
 */
function mergeTranscriptWithSpeakers(
    transcription: { text: string; segments: TranscriptSegment[] },
    diarization: DiarizationResponse
): { speaker: string; role: string; raw_text: string; start: number; end: number }[] {

    const results: { speaker: string; role: string; raw_text: string; start: number; end: number }[] = [];

    // Nếu không có diarization, gán tất cả cho 1 speaker mặc định
    if (diarization.speakers.length === 0) {
        if (transcription.segments.length > 0) {
            for (const seg of transcription.segments) {
                results.push({
                    speaker: 'SPEAKER_00',
                    role: 'Người nói',
                    raw_text: seg.text,
                    start: seg.start,
                    end: seg.end
                });
            }
        } else if (transcription.text) {
            results.push({
                speaker: 'SPEAKER_00',
                role: 'Người nói',
                raw_text: transcription.text,
                start: 0,
                end: 0
            });
        }
        return results;
    }

    // Nếu có diarization, match segments
    for (const seg of transcription.segments) {
        const segMid = (seg.start + seg.end) / 2;

        // Tìm speaker segment chứa thời điểm giữa của transcript segment
        let matchedSpeaker = diarization.speakers.find(
            sp => sp.start <= segMid && segMid <= sp.end
        );

        // Fallback: tìm segment gần nhất
        if (!matchedSpeaker) {
            matchedSpeaker = diarization.speakers.reduce((closest, current) => {
                const closestDist = Math.min(
                    Math.abs(closest.start - segMid),
                    Math.abs(closest.end - segMid)
                );
                const currentDist = Math.min(
                    Math.abs(current.start - segMid),
                    Math.abs(current.end - segMid)
                );
                return currentDist < closestDist ? current : closest;
            }, diarization.speakers[0]);
        }

        results.push({
            speaker: matchedSpeaker?.speaker || 'UNKNOWN',
            role: matchedSpeaker?.role || 'Người nói',
            raw_text: seg.text,
            start: seg.start,
            end: seg.end
        });
    }

    return results;
}

/**
 * Sử dụng Llama 3 để sửa lỗi thuật ngữ y khoa
 */
async function fixMedicalText(text: string): Promise<string> {
    if (!text || text.trim().length === 0) return text;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Bạn là chuyên gia hiệu chỉnh văn bản y khoa tiếng Việt.
Nhiệm vụ: Sửa lỗi chính tả, ngữ pháp và thuật ngữ y tế từ đoạn văn thô được chuyển từ giọng nói.
Quy tắc:
1. Giữ nguyên ý nghĩa gốc của người nói
2. Sửa các lỗi phát âm thường gặp trong y khoa:
   - "đau thượng vịt" → "đau thượng vị"
   - "phải sụp" → "sốt"
   - "ăn chích" → "ăn kiêng"
3. Chuẩn hóa thuật ngữ y tế
4. Trả về đoạn văn đã sửa, KHÔNG thêm lời dẫn hay giải thích`
                },
                { role: "user", content: text }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            max_tokens: 500
        });

        return chatCompletion.choices[0]?.message?.content || text;
    } catch (error) {
        console.error('Medical fixer error:', error);
        return text;
    }
}

/**
 * Main API Handler - Xử lý audio và trả về transcript với speaker labels
 */
export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
        return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    try {
        console.log(`📁 Received audio: ${file.size} bytes`);

        // Chạy song song: STT và Diarization
        const [transcription, diarization] = await Promise.all([
            transcribeWithGroq(file),
            getDiarization(file)
        ]);

        console.log(`📝 Transcription: ${transcription.text.substring(0, 100)}...`);
        console.log(`🎤 Diarization: ${diarization.num_speakers} speakers found`);

        // Nếu không có text, trả về empty
        if (!transcription.text || transcription.text.trim().length === 0) {
            return NextResponse.json({
                success: true,
                segments: [],
                raw_text: "",
                num_speakers: 0
            });
        }

        // Merge transcript với speakers
        const mergedSegments = mergeTranscriptWithSpeakers(transcription, diarization);

        // Sửa lỗi y khoa cho từng segment
        const processedSegments: ProcessedSegment[] = await Promise.all(
            mergedSegments.map(async (seg) => ({
                ...seg,
                clean_text: await fixMedicalText(seg.raw_text)
            }))
        );

        return NextResponse.json({
            success: true,
            segments: processedSegments,
            raw_text: transcription.text,
            num_speakers: diarization.num_speakers,
            speaker_mapping: diarization.speaker_mapping || {}
        });

    } catch (error) {
        console.error('❌ Processing error:', error);
        return NextResponse.json(
            { error: "Lỗi xử lý hệ thống", details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * Health check endpoint
 */
export async function GET() {
    // Check diarization service health
    let diarizationStatus = 'unknown';
    try {
        const response = await fetch(`${DIARIZATION_SERVICE_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            diarizationStatus = data.model_loaded ? 'ready' : 'loading';
        } else {
            diarizationStatus = 'unavailable';
        }
    } catch {
        diarizationStatus = 'unavailable';
    }

    return NextResponse.json({
        status: 'ok',
        services: {
            groq_stt: process.env.GROQ_API_KEY ? 'configured' : 'missing_key',
            diarization: diarizationStatus
        }
    });
}