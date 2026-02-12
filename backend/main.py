from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
def health():
    return {"status": "ok"}

@app.get("/hi")
def hi():
    return {"text": "Hi from backend"}

@app.get("/api/hello")
def hello():
    return {"message": "Backend connected successfully"}
