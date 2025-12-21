from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from typing import Optional
import os


app = FastAPI()

# CORS so the frontend can talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

class ChatRequest(BaseModel):
    message: str

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    x_openai_api_key: Optional[str] = Header(None, alias="X-OpenAI-API-Key")
):
    # Get API key from header (preferred) or fall back to environment variable
    api_key = x_openai_api_key or os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="OpenAI API key is required. Please provide it in the X-OpenAI-API-Key header."
        )
    
    try:
        # Create OpenAI client with the provided API key
        client = OpenAI(api_key=api_key)
        user_message = request.message
        
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "system", "content": "You are a supportive mental coach."},
                {"role": "user", "content": user_message}
            ]
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling OpenAI API: {str(e)}")
