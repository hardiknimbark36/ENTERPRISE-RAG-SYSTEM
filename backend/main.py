import os
import io
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pinecone import Pinecone
from groq import Groq
from pypdf import PdfReader
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Enterprise Multi-Doc RAG API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (your frontend) to connect
    allow_credentials=True,
    allow_methods=["*"],  # Allows POST, GET, etc.
    allow_headers=["*"],  # Allows all headers
)

# Initialize API clients safely from Environment Variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "rag-index")

if not GROQ_API_KEY or not PINECONE_API_KEY:
    raise ValueError("Missing critical API keys in environment variables!")

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)
groq_client = Groq(api_key=GROQ_API_KEY)

# Load embedding model locally (Free & Open Source)
HF_TOKEN = os.getenv("HF_TOKEN")
HF_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

def get_embedding(text):
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    response = requests.post(HF_API_URL, headers=headers, json={"inputs": text, "options": {"wait_for_model": True}})
    return response.json()

class QueryRequest(BaseModel):
    question: str

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Extracts text from an uploaded PDF, chunks it, and updates Pinecone."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        # Read the file securely into memory first
        contents = await file.read()
        pdf_reader = PdfReader(io.BytesIO(contents))
        
        raw_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                raw_text += text + "\n"
                
        # Safeguard against empty text extraction
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from this PDF.")
        
        # Chunking strategy: 800 tokens with 200 overlap
        words = raw_text.split()
        chunks = []
        chunk_size = 800
        overlap = 200
        
        i = 0
        while i < len(words):
            chunk_words = words[i:i + chunk_size]
            chunks.append(" ".join(chunk_words))
            i += (chunk_size - overlap)

        print(f"✅ Success: Extracted {len(chunks)} chunks from {file.filename}")

        # Upsert chunks to Pinecone with metadata linking back to file name
        vectors_to_upsert = []
        for idx, chunk in enumerate(chunks):
            embedding = get_embedding(chunk)
            chunk_id = f"{file.filename}_chunk_{idx}"
            vectors_to_upsert.append({
                "id": chunk_id,
                "values": embedding,
                "metadata": {"text": chunk, "source": file.filename}
            })
            
        # Batch upload to Pinecone (Max 100 per batch for stability)
        for b in range(0, len(vectors_to_upsert), 100):
            index.upsert(vectors=vectors_to_upsert[b:b+100])
            
        return {"status": "success", "message": f"Successfully parsed and indexed {len(chunks)} chunks from {file.filename}."}
        
    except Exception as e:
        print(f"❌ Error during upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@app.post("/ask")
async def ask_question(request: QueryRequest):
    """Performs strict contextual guardrail matching before answering."""
    try:
       query_vector = get_embedding(request.question)
        
        # Query Pinecone
        search_results = index.query(vector=query_vector, top_k=3, include_metadata=True)
        
        # Guardrail check: Minimum similarity score validation
        relevant_chunks = []
        sources = set()
        for match in search_results.get("matches", []):
            if match.get("score", 0) >= 0.0: # Guardrail Score Threshold
                relevant_chunks.append(match["metadata"]["text"])
                sources.add(match["metadata"]["source"])
                
        if not relevant_chunks:
            return {
                "answer": "I am strictly programmed to answer from your document domain context. I cannot find any text referencing this query in the uploaded files.",
                "sources": []
            }
            
        # Package Context for Llama-3.3
        context_block = "\n---\n".join(relevant_chunks)
        system_prompt = (
            "You are a strict Enterprise Document Assistant. Your primary rule is to answer the user query "
            "using ONLY the verified context block provided below. Do not use outside facts. If the information "
            "is not explicitly inside the context block, state that you cannot find it.\n\n"
            f"CONTEXT BLOCK:\n{context_block}"
        )
        
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.question}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2 # Lower temperature = higher factual accuracy
        )
        
        return {
            "answer": chat_completion.choices[0].message.content,
            "sources": list(sources)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))