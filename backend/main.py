from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
from contextlib import asynccontextmanager

from bot import initialize_bot, get_bot

# Pydantic models for request/response
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    sources: List[str]

class UploadResponse(BaseModel):
    status: str
    message: str

class StatusResponse(BaseModel):
    initialized: bool
    documents_indexed: int
    model: Optional[str]

# Startup/shutdown lifecycle
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize bot
    try:
        initialize_bot()
        print("Arth-Mitra bot initialized")
    except Exception as e:
        print(f"Bot initialization failed: {e}")
        print("  Set GOOGLE_API_KEY in .env file")
    yield
    # Shutdown: cleanup if needed
    print("Shutting down...")

app = FastAPI(
    title="Arth-Mitra API",
    description="AI-powered financial assistant for Indian users",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/ping")
def health():
    return {"status": "ok"}



@app.get("/api/hello")
def hello():
    return {"message": "Backend connected successfully"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """Chat with Arth-Mitra AI assistant"""
    try:
        bot = get_bot()
        if not bot._initialized:
            raise HTTPException(
                status_code=503,
                detail="(1)Bot not initialized. Check GOOGLE_API_KEY."
            )
        
        result = bot.get_response(request.message)
        return ChatResponse(
            response=result["response"],
            sources=result["sources"]
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/api/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload and index a document (PDF, CSV, TXT)"""
    try:
        bot = get_bot()
        if not bot._initialized:
            raise HTTPException(
                status_code=503,
                detail="(2)Bot not initialized. Check GOOGLE_API_KEY."
            )
        
        # Validate file type
        allowed_extensions = [".pdf", ".csv", ".txt", ".md"]
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {allowed_extensions}"
            )
        
        # Save file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Index document
        result = bot.add_documents(file_path)
        
        return UploadResponse(
            status=result["status"],
            message=result["message"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/api/status", response_model=StatusResponse)
def get_status():
    """Get bot status and statistics"""
    try:
        bot = get_bot()
        status = bot.get_status()
        return StatusResponse(**status)
    except Exception as e:
        return StatusResponse(
            initialized=False,
            documents_indexed=0,
            model=None
        )
