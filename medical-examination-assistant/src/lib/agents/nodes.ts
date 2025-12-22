import Groq from "groq-sdk";
import { AgentState } from "./state";
import { medicalVectorStore } from "../rag/vectorStore";
import { Document } from "@langchain/core/documents";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- 1. SCRIBE AGENT ---
export async function scribeNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("✍️ Scribe Agent working...");

    const prompt = `Bạn là thư ký y khoa chuyên nghiệp.
Nhiệm vụ: Chuyển transcript hội thoại thành bệnh án chuẩn SOAP tiếng Việt.

Transcript:
"${state.transcript}"

Yêu cầu output JSON format:
{
    "subjective": "Tóm tắt triệu chứng cơ năng, bệnh sử...",
    "objective": "Tóm tắt triệu chứng thực thể, dấu hiệu sinh tồn (nếu có)...",
    "assessment": "Chẩn đoán sơ bộ...",
    "plan": "Kế hoạch điều trị, thuốc, dặn dò..."
}
Chỉ trả về JSON hợp lệ, không có text khác.`;

    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        response_format: { type: "json_object" }
    });

    const soap = JSON.parse(completion.choices[0]?.message?.content || "{}");
    return { soap };
}

// --- 2. ICD-10 AGENT ---
export async function icdNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("🏷️ ICD-10 Agent working...");

    const prompt = `Bạn là chuyên gia về mã hóa bệnh lý ICD-10.
Chẩn đoán: "${state.soap.assessment}"
Triệu chứng: "${state.soap.subjective}"

Nhiệm vụ: Tìm mã ICD-10 phù hợp nhất (ưu tiên mã chi tiết).
Trả về JSON list các mã: ["K29.7 - Viêm dạ dày", "R10.1 - Đau vùng thượng vị"]`;

    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        response_format: { type: "json_object" } // Groq usually handles this better as text if list, but let's try strict json
    });

    // Handle potential non-JSON output or wrapper keys
    try {
        const content = completion.choices[0]?.message?.content || "{}";
        // Attempt to parse list directly or finding a key
        const parsed = JSON.parse(content);
        // If it returns { "codes": [...] } or just [...]
        const codes = Array.isArray(parsed) ? parsed : (parsed.codes || parsed.icd10 || []);
        return { icdCodes: codes };
    } catch (e) {
        return { icdCodes: ["Error parsing ICD codes"] };
    }
}

// --- 3. MEDICAL EXPERT AGENT (RAG) ---
export async function expertNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("👨‍⚕️ Medical Expert Agent working...");

    // 1. Initialize DB (if not ready)
    await medicalVectorStore.initialize();

    // 2. Retrieve relevant docs based on Subjective
    const retriever = medicalVectorStore.getRetriever();
    const docs = await retriever.invoke(state.soap.subjective);

    const context = docs.map((d: Document) => d.pageContent).join("\n---\n");
    const references = docs.map((d: Document) => (d.metadata.source || "Unknown Source").replace(".md", ""));

    // 3. Ask LLM with Context
    const prompt = `Bạn là chuyên gia y tế cố vấn.
Dựa vào Y VĂN ĐƯỢC CUNG CẤP dưới đây, hãy đưa ra nhận xét và gợi ý điều trị.

Y VĂN (Context):
${context}

BỆNH ÁN (SOAP):
S: ${state.soap.subjective}
O: ${state.soap.objective}
A: ${state.soap.assessment}

YÊU CẦU:
- Đưa ra lời khuyên ngắn gọn cho bác sĩ.
- Cảnh báo nếu phác đồ hiện tại (Plan) có gì sai sót so với Y VĂN.
- Gợi ý xét nghiệm cần làm thêm.
- TRÍCH DẪN từ y văn (nếu có).`;

    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2
    });

    return {
        medicalAdvice: completion.choices[0]?.message?.content || "",
        references
    };
}
