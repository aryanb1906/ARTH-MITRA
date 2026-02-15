from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import sys
import shutil
from contextlib import asynccontextmanager
import json

from bot import initialize_bot, get_bot

# Pydantic models for request/response
class UserProfile(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    income: str
    employmentStatus: str
    taxRegime: str
    homeownerStatus: str
    children: Optional[str] = None
    childrenAges: Optional[str] = None
    parentsAge: Optional[str] = None
    investmentCapacity: Optional[str] = None
    riskAppetite: Optional[str] = None
    financialGoals: Optional[List[str]] = None
    existingInvestments: Optional[List[str]] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    profile: Optional[UserProfile] = None
    history: Optional[List[ChatMessage]] = None

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
    # Startup: Bot will initialize on first request (lazy loading)
    print("⚡ Arth-Mitra API starting up...")
    print("📝 Bot will initialize on first chat/upload request")
    print(f"🔐 Checking API keys...")
    
    from dotenv import load_dotenv
    load_dotenv()
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    
    if gemini_key:
        print("✅ Gemini API key found")
    elif openrouter_key:
        print("✅ OpenRouter API key found")
    else:
        print("⚠️ WARNING: No API key configured in .env")
        print("Set GEMINI_API_KEY or OPENROUTER_API_KEY to use the backend")
    
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
    allow_origins=["*"],
    allow_credentials=False,
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
            # Initialize bot on first request
            print("🔄 Initializing bot for first time...")
            bot.initialize(auto_index=True)
            print("✅ Bot initialized successfully")
        
        # Convert profile to dict if provided
        profile_dict = request.profile.dict() if request.profile else None
        history = [msg.dict() for msg in request.history] if request.history else None
        
        result = bot.get_response(request.message, profile=profile_dict, history=history)
        return ChatResponse(
            response=result["response"],
            sources=result["sources"]
        )
    except RuntimeError as e:
        print(f"❌ Runtime Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/api/chat/stream")
def chat_stream(request: ChatRequest):
    """Stream chat response tokens via SSE"""
    try:
        bot = get_bot()
        if not bot._initialized:
            print("🔄 Initializing bot for first time...")
            bot.initialize(auto_index=True)
            print("✅ Bot initialized successfully")

        profile_dict = request.profile.dict() if request.profile else None
        history = [msg.dict() for msg in request.history] if request.history else None

        token_iter, sources = bot.stream_response(request.message, profile=profile_dict, history=history)

        def event_stream():
            try:
                for token in token_iter:
                    if token:
                        yield f"event: token\ndata: {json.dumps(token)}\n\n"
                yield f"event: sources\ndata: {json.dumps(sources)}\n\n"
                yield "event: done\ndata: [DONE]\n\n"
            except Exception as e:
                yield f"event: error\ndata: {json.dumps(str(e))}\n\n"
                yield "event: done\ndata: [DONE]\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")
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
            # Initialize bot on first request
            bot.initialize(auto_index=True)
        
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
