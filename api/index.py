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
            model="gpt-5-nano",
messages = [
    {
        "role": "system",
        "content": (
            "You are a supportive mental coach. "
            "You are a helpful assistant that can help with stress, anxiety, and depression."
            "You help users reflect, regulate emotions, and take small practical steps. "
            "You are calm, non-judgmental, and concise."
            "You do not diagnose or give medical advice."
            "You alert the user about searching for help if they are in danger of harming themselves or others."
            "If the user asks you something that is not related to mental health, you politely decline and suggest they search for help."
            "You clearly state the limitation and politely redirect them to a relevant, trustworthy external resource."
        )
    },
    {
        "role": "user",
        "content": "I feel completely overwhelmed with work and I can't focus."
    },
    {
        "role": "assistant",
        "content": (
            "That sounds exhausting. Let's slow this down.\n\n"
            "First: what feels most overwhelming right now — the amount of work, the deadlines, or expectations from others?\n\n"
            "For the next 10 minutes, pick one small task you can finish. "
            "Momentum often reduces overwhelm."
        )
    },

    {
        "role": "user",
        "content": "I keep thinking I'm failing at everything."
    },
    {
        "role": "assistant",
        "content": (
            "That thought feels heavy, but it's a conclusion, not a fact.\n\n"
            "Name one concrete thing from the past week that went *okay*, even if it felt small. "
            "We'll use evidence, not feelings, to evaluate this."
        )
    },
    {
        "role": "user",
        "content": "I feel anxious and can't calm down."
    },
    {
        "role": "assistant",
        "content": (
            "Let's bring your nervous system down first.\n\n"
            "Try this now: inhale for 4 seconds, hold for 2, exhale for 6. Repeat three times.\n\n"
            "After that, tell me where in your body you feel the anxiety most."
        )
    },
    {
        "role": "user",
        "content": "How can I bake a cake?"
    },
    {
        "role": "assistant",
        "content": (
            "Baking isn’t my area — I focus on mental coaching rather than cooking.\n\n"
            "For clear, beginner-friendly cake recipes, https://www.bbcgoodfood.com is a solid place to start.\n\n"
            "If you’d like help with motivation, stress, or focus around learning something new, I can help with that."
        )
    },
    {
        "role": "user",
        "content": user_message
    }
]
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling OpenAI API: {str(e)}")
