# MEA - Medical Examination Assistant

Hệ thống trợ lý ghi chép và hỗ trợ chẩn đoán lâm sàng sử dụng AI để chuyển đổi giọng nói thành văn bản với khả năng phân biệt người nói (bác sĩ/bệnh nhân).

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│                   (Recording + Display)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ POST /api/stt
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Route                          │
│              ┌─────────────┬─────────────┐                   │
│              │             │             │                   │
│              ▼             ▼             ▼                   │
│     ┌────────────┐ ┌─────────────┐ ┌────────────┐           │
│     │Groq Whisper│ │ Pyannote    │ │Medical     │           │
│     │(STT)       │ │ Service     │ │Fixer       │           │
│     │            │ │ (Docker)    │ │(Llama 3)   │           │
│     └────────────┘ └─────────────┘ └────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Tạo file `.env.local`

```env
# Groq API Key (https://console.groq.com/keys)
GROQ_API_KEY=your_groq_api_key_here

# HuggingFace Token cho Pyannote (https://huggingface.co/settings/tokens)
HF_TOKEN=your_huggingface_token_here

# URL của Diarization Service
DIARIZATION_SERVICE_URL=http://localhost:8001
```

### 3. Khởi động Diarization Service (Docker)

```bash
# Yêu cầu: Docker đã được cài đặt
docker-compose up --build -d
```

> ⚠️ **Lưu ý**: Lần đầu chạy sẽ tải model Pyannote (~1.5GB), có thể mất vài phút.

### 4. Khởi động Next.js

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để sử dụng.

## 📋 Yêu cầu

### HuggingFace Token
1. Đăng ký tài khoản tại [huggingface.co](https://huggingface.co)
2. Tạo Access Token tại [Settings > Access Tokens](https://huggingface.co/settings/tokens)
3. Accept terms tại [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)

### Groq API Key
1. Đăng ký tại [console.groq.com](https://console.groq.com)
2. Tạo API Key tại [API Keys](https://console.groq.com/keys)

## 🎯 Tính năng

- ✅ **Speech-to-Text**: Chuyển đổi giọng nói tiếng Việt thành văn bản (Groq Whisper)
- ✅ **Speaker Diarization**: Phân biệt người nói (Pyannote AI)
- ✅ **Medical Fixer**: Sửa lỗi chính tả và thuật ngữ y khoa (Llama 3)
- ✅ **Realtime Display**: Hiển thị transcript theo thời gian thực

## 📁 Cấu trúc Project

```
medical-examination-assistant/
├── src/
│   └── app/
│       ├── page.tsx              # Frontend UI
│       └── api/
│           └── stt/
│               └── route.tsx     # API endpoint (STT + Diarization)
├── diarization-service/          # Python Pyannote service
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
├── docker-compose.yml            # Docker orchestration
└── README.md
```

## 🔧 Troubleshooting

### Diarization Service không khởi động
```bash
# Kiểm tra logs
docker-compose logs diarization

# Kiểm tra HF_TOKEN
docker-compose exec diarization env | grep HF_TOKEN
```

### Lỗi "Model not loaded"
- Đảm bảo đã accept terms tại HuggingFace
- Kiểm tra HF_TOKEN trong `.env`

### GPU được sử dụng
- phần GPU trong `docker-compose.yml` nếu có NVIDIA GPU.

## 📄 License

MIT
