"""
Pyannote Speaker Diarization Microservice
Minimal service - chỉ làm 1 việc: phân biệt người nói trong audio
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pyannote.audio import Pipeline
import torch
import tempfile
import os
import json

app = FastAPI(
    title="MEA Diarization Service",
    description="Speaker diarization microservice using Pyannote",
    version="1.0.0"
)

# CORS - cho phép Next.js gọi
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline - load 1 lần khi startup
diarization_pipeline = None

@app.on_event("startup")
async def load_model():
    """Load Pyannote model khi service khởi động"""
    global diarization_pipeline
    
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        print("WARNING: HF_TOKEN not set. Diarization will not work!")
        return
    
    print("Loading Pyannote speaker-diarization model...", flush=True)
    
    try:
        # Try 3.1 first, fall back to 2.1 if needed
        try:
            diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                token=hf_token
            )
            print("Loaded model version 3.1", flush=True)
        except Exception as e1:
            print(f"Failed to load 3.1: {e1}", flush=True)
            print("Trying older version 2.1...", flush=True)
            diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization@2.1",
                token=hf_token
            )
            print("Loaded model version 2.1", flush=True)
        
        # Move to GPU if available
        if torch.cuda.is_available():
            diarization_pipeline.to(torch.device("cuda"))
            print("Model loaded on GPU", flush=True)
        else:
            print("Model loaded on CPU (GPU not available)", flush=True)
            
    except Exception as e:
        import traceback
        print(f"Failed to load model: {e}", flush=True)
        print(f"Full error: {traceback.format_exc()}", flush=True)
        print("Make sure you have accepted the terms at:", flush=True)
        print("   https://huggingface.co/pyannote/speaker-diarization-3.1", flush=True)
        print("   https://huggingface.co/pyannote/segmentation-3.0", flush=True)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "model_loaded": diarization_pipeline is not None,
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    }


@app.post("/diarize")
async def diarize_audio(file: UploadFile = File(...)):
    """
    Phân tích audio và trả về danh sách speakers với timestamps
    
    Input: Audio file (wav, mp3, m4a, webm, etc.)
    Output: List of speaker segments with start/end times
    
    Example response:
    {
        "speakers": [
            {"start": 0.0, "end": 2.5, "speaker": "SPEAKER_00"},
            {"start": 2.5, "end": 5.0, "speaker": "SPEAKER_01"},
            {"start": 5.0, "end": 7.5, "speaker": "SPEAKER_00"}
        ],
        "num_speakers": 2
    }
    """
    
    if diarization_pipeline is None:
        raise HTTPException(
            status_code=503,
            detail="Diarization model not loaded. Check HF_TOKEN environment variable."
        )
    
    # Save uploaded file to temp
    try:
        suffix = os.path.splitext(file.filename)[1] if file.filename else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        print(f"Processing audio file: {tmp_path} ({len(content)} bytes)", flush=True)
        
        # Check minimum file size (at least 1KB for meaningful audio)
        if len(content) < 1000:
            print("Audio file too small, skipping diarization", flush=True)
            return {
                "speakers": [],
                "num_speakers": 0,
                "duration": 0
            }
        
        # Run diarization
        diarization = diarization_pipeline(tmp_path)
        
        # Check if diarization returned valid result
        if diarization is None:
            print("Diarization returned None (no speech detected)", flush=True)
            return {
                "speakers": [],
                "num_speakers": 0, 
                "duration": 0
            }
        
        # Extract speaker segments
        speakers = []
        speaker_set = set()
        
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            speakers.append({
                "start": round(turn.start, 2),
                "end": round(turn.end, 2),
                "speaker": speaker
            })
            speaker_set.add(speaker)
        
        # Calculate duration safely
        duration = 0
        if speakers:
            try:
                timeline = diarization.get_timeline()
                if timeline and hasattr(timeline, 'extent'):
                    extent = timeline.extent()
                    if extent and hasattr(extent, 'end') and extent.end is not None:
                        duration = round(extent.end, 2)
            except Exception as e:
                print(f"Error calculating duration: {e}", flush=True)
                duration = speakers[-1]["end"] if speakers else 0
        
        print(f"Found {len(speaker_set)} speakers, {len(speakers)} segments", flush=True)
        
        return {
            "speakers": speakers,
            "num_speakers": len(speaker_set),
            "duration": duration
        }
        
    except Exception as e:
        print(f"Diarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Cleanup temp file
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.post("/diarize-with-mapping")
async def diarize_with_speaker_mapping(
    file: UploadFile = File(...),
    doctor_first: bool = True
):
    """
    Diarization với mapping tên người nói (Bác sĩ / Bệnh nhân)
    
    Params:
        - file: Audio file
        - doctor_first: Nếu True, người nói đầu tiên là Bác sĩ
    """
    
    result = await diarize_audio(file)
    
    # Create speaker mapping based on who speaks first
    speaker_names = {}
    roles = ["Bác sĩ", "Bệnh nhân"] if doctor_first else ["Bệnh nhân", "Bác sĩ"]
    
    for segment in result["speakers"]:
        speaker_id = segment["speaker"]
        if speaker_id not in speaker_names:
            role_index = len(speaker_names)
            speaker_names[speaker_id] = roles[role_index] if role_index < len(roles) else f"Người {role_index + 1}"
        
        segment["role"] = speaker_names[speaker_id]
    
    result["speaker_mapping"] = speaker_names
    
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
