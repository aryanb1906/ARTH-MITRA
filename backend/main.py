from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import sys
import shutil
from contextlib import asynccontextmanager
import json
import time

from bot import initialize_bot, get_bot
from database import get_db, init_db
from sqlalchemy.orm import Session
import crud

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
    userId: Optional[str] = None  # For database logging
    sessionId: Optional[str] = None  # For database logging

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

# New models for database endpoints
class UserRegister(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    age: Optional[int]
    income: Optional[str]
    employmentStatus: Optional[str]
    taxRegime: Optional[str]

class ChangePassword(BaseModel):
    currentPassword: str
    newPassword: str

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatSessionResponse(BaseModel):
    id: str
    title: str
    createdAt: str
    messageCount: int

class SavedMessageCreate(BaseModel):
    messageId: str
    content: str
    note: Optional[str] = None
    tags: Optional[List[str]] = None

# Startup/shutdown lifecycle
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Bot will initialize on first request (lazy loading)
    print("⚡ Arth-Mitra API starting up...")
    print("📝 Bot will initialize on first chat/upload request")
    
    # Initialize database
    print("🔧 Initializing database...")
    init_db()
    print("✅ Database ready")
    
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
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Chat with Arth-Mitra AI assistant"""
    start_time = time.time()
    
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
        
        # Get bot response
        result = bot.get_response(request.message, profile=profile_dict, history=history)
        
        # Calculate response time
        response_time = time.time() - start_time
        
        # Log to database if user_id and session_id provided
        if request.userId and request.sessionId:
            try:
                # Save user message
                crud.create_chat_message(
                    db, request.sessionId, "user", request.message
                )
                
                # Save assistant response
                crud.create_chat_message(
                    db, request.sessionId, "assistant", result["response"],
                    sources=result["sources"],
                    response_time=response_time,
                    cached=result.get("cached", False)
                )
                
                # Log analytics event
                crud.log_event(db, request.userId, "query", {
                    "message": request.message[:100],
                    "response_time": response_time
                })
            except Exception as e:
                print(f"⚠️ Failed to log to database: {e}")
        
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
            token_count = 0
            try:
                for token in token_iter:
                    if token:
                        token_count += 1
                        yield f"event: token\ndata: {json.dumps(token)}\n\n"
                print(f"📤 Streamed {token_count} tokens")
                yield f"event: sources\ndata: {json.dumps(sources)}\n\n"
                yield "event: done\ndata: [DONE]\n\n"
            except Exception as e:
                print(f"❌ Stream error: {e}")
                yield f"event: error\ndata: {json.dumps(str(e))}\n\n"
                yield "event: done\ndata: [DONE]\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/api/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...), user_id: Optional[str] = None, db: Session = Depends(get_db)):
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
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Index document
        result = bot.add_documents(file_path)
        
        # Extract chunks indexed from message
        chunks_indexed = 0
        if "Indexed" in result["message"]:
            import re
            match = re.search(r'Indexed (\d+) chunks', result["message"])
            if match:
                chunks_indexed = int(match.group(1))
        
        # Log to database if user_id provided
        if user_id:
            try:
                crud.create_document(
                    db, user_id, file.filename, file_path, 
                    file_ext, file_size, chunks_indexed
                )
                crud.log_event(db, user_id, "upload", {
                    "filename": file.filename,
                    "file_type": file_ext,
                    "chunks": chunks_indexed
                })
            except Exception as e:
                print(f"⚠️ Failed to log document to database: {e}")
        
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


@app.post("/api/cache/clear")
def clear_cache():
    """Clear the response cache for fresh responses"""
    try:
        bot = get_bot()
        if bot._initialized:
            bot.clear_cache()
            return {"status": "success", "message": "Cache cleared successfully"}
        return {"status": "info", "message": "Bot not initialized yet"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


# ==================== NEW DATABASE ENDPOINTS ====================

@app.post("/api/users/register")
def register_user(user: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = crud.get_user_by_email(db, user.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        existing_username = crud.get_user_by_username(db, user.username)
        if existing_username:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Create user
        new_user = crud.create_user(db, user.email, user.username, user.password)
        
        # Log event
        crud.log_event(db, new_user.id, "register", {"email": user.email})
        
        return {
            "status": "success",
            "message": "User registered successfully",
            "user": new_user.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.post("/api/users/login")
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    try:
        user = crud.get_user_by_email(db, credentials.email)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if not crud.verify_password(user, credentials.password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Update last login
        crud.update_last_login(db, user.id)
        
        # Log event
        crud.log_event(db, user.id, "login", {"email": credentials.email})
        
        return {
            "status": "success",
            "message": "Login successful",
            "user": user.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.get("/api/users/{user_id}/profile")
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    """Get user profile"""
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.to_dict()


@app.put("/api/users/{user_id}/profile")
def update_profile(user_id: str, profile: UserProfile, db: Session = Depends(get_db)):
    """Update user profile"""
    try:
        updated_user = crud.update_user_profile(db, user_id, profile.dict())
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Log event
        crud.log_event(db, user_id, "profile_update", {"updated_fields": list(profile.dict().keys())})
        
        return {
            "status": "success",
            "message": "Profile updated successfully",
            "user": updated_user.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")


@app.post("/api/users/{user_id}/change-password")
def change_password(user_id: str, pwd_change: ChangePassword, db: Session = Depends(get_db)):
    """Change user password"""
    try:
        user = crud.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not crud.verify_password(user, pwd_change.currentPassword):
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        # Update password
        user = crud.change_password(db, user_id, pwd_change.newPassword)
        
        # Log event
        crud.log_event(db, user_id, "password_change", {})
        
        return {
            "status": "success",
            "message": "Password changed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password change failed: {str(e)}")


@app.delete("/api/users/{user_id}")
def delete_account(user_id: str, db: Session = Depends(get_db)):
    """Delete user account"""
    try:
        user = crud.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Log event before deletion
        crud.log_event(db, user_id, "account_deleted", {})
        
        # Delete user and all related data
        crud.delete_user(db, user_id)
        
        return {
            "status": "success",
            "message": "Account deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Account deletion failed: {str(e)}")


@app.post("/api/users/{user_id}/sessions")
def create_session(user_id: str, session_data: ChatSessionCreate, db: Session = Depends(get_db)):
    """Create a new chat session"""
    try:
        session = crud.create_chat_session(db, user_id, session_data.title)
        return {
            "status": "success",
            "session": session.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@app.get("/api/users/{user_id}/sessions")
def get_user_sessions(user_id: str, db: Session = Depends(get_db)):
    """Get all chat sessions for a user"""
    try:
        sessions = crud.get_user_chat_sessions(db, user_id)
        return {
            "sessions": [session.to_dict() for session in sessions]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve sessions: {str(e)}")


@app.get("/api/sessions/{session_id}/messages")
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    """Get all messages in a session"""
    try:
        messages = crud.get_session_messages(db, session_id)
        return {
            "messages": [msg.to_dict() for msg in messages]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve messages: {str(e)}")


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat session"""
    try:
        deleted = crud.delete_chat_session(db, session_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"status": "success", "message": "Session deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")


@app.get("/api/users/{user_id}/documents")
def get_user_documents(user_id: str, db: Session = Depends(get_db)):
    """Get all documents for a user"""
    try:
        documents = crud.get_user_documents(db, user_id)
        return {
            "documents": [doc.to_dict() for doc in documents]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve documents: {str(e)}")


@app.post("/api/users/{user_id}/saved-messages")
def save_message(user_id: str, message_data: SavedMessageCreate, db: Session = Depends(get_db)):
    """Save a message for later reference"""
    try:
        saved = crud.save_message(
            db, user_id, message_data.messageId, message_data.content,
            message_data.note, message_data.tags
        )
        return {
            "status": "success",
            "saved": saved.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save message: {str(e)}")


@app.get("/api/users/{user_id}/saved-messages")
def get_saved_messages(user_id: str, db: Session = Depends(get_db)):
    """Get all saved messages for a user"""
    try:
        messages = crud.get_user_saved_messages(db, user_id)
        return {
            "messages": [msg.to_dict() for msg in messages]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve saved messages: {str(e)}")


@app.delete("/api/saved-messages/{saved_id}")
def delete_saved_message(saved_id: str, db: Session = Depends(get_db)):
    """Delete a saved message"""
    try:
        deleted = crud.delete_saved_message(db, saved_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Saved message not found")
        return {"status": "success", "message": "Saved message deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete saved message: {str(e)}")


@app.get("/api/analytics/summary")
def get_analytics_summary(days: int = 7, db: Session = Depends(get_db)):
    """Get overall analytics summary"""
    try:
        summary = crud.get_analytics_summary(db, days)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")


@app.get("/api/analytics/query-distribution")
def get_query_distribution(days: int = 7, db: Session = Depends(get_db)):
    """Get query distribution over time"""
    try:
        distribution = crud.get_query_distribution(db, days)
        return distribution
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get distribution: {str(e)}")


@app.get("/api/users/{user_id}/analytics")
def get_user_analytics(user_id: str, days: int = 30, db: Session = Depends(get_db)):
    """Get analytics for a specific user"""
    try:
        analytics = crud.get_user_analytics(db, user_id, days)
        return {
            "analytics": [event.to_dict() for event in analytics]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user analytics: {str(e)}")
