# AskDoc AI 🤖📄

**A production-grade Retrieval-Augmented Generation (RAG) system that eliminates LLM hallucinations by grounding every answer strictly in user-uploaded documents.**

Unlike generic AI chatbots that guess or hallucinate, AskDoc AI refuses to answer if the information isn't present in the uploaded document - making it suitable for enterprise use cases where accuracy is non-negotiable.

🔗 **[Live Demo](https://enterprise-rag-system-one.vercel.app/)** &nbsp;|&nbsp; 📂 **[Backend API](https://enterprise-rag-system-2lqh.onrender.com/docs)**

<img width="720" height="406" alt="RAG SYSTEM_Working video" src="https://github.com/user-attachments/assets/da92b1a1-5b9f-4738-b18b-5a648d362dfd" />


---

## 🎯 The Problem This Solves

Companies cannot deploy generic LLMs (like ChatGPT) directly to customers or employees because they:
- Hallucinate facts with full confidence
- Cannot be restricted to a company's private knowledge base
- Pose data leakage and compliance risks

**AskDoc AI solves this** by combining semantic search with strict prompt engineering, ensuring the AI only speaks from verified, retrieved context - never from its own training data.

---

## ✨ Key Features

- 🔐 **Authenticated Access** - Secure sign-in/sign-up flow using Clerk
- 📄 **PDF Upload & Processing** - Automatic chunking and vectorization of documents
- 💬 **Grounded Chat Interface** - Real-time Q&A restricted to document content
- 🚫 **Hallucination Guardrails** - Refuses to answer when context is insufficient
- ⚡ **Low-Latency Inference** - Powered by Llama 3.3 via Groq's LPU infrastructure
- 🎨 **Polished UX** - Loading states, error handling, and cold-start transparency

---

## 🏗️ System Architecture

```text
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Browser   │─────▶│  Next.js Server   │─────▶│  FastAPI Backend │
│  (Clerk     │      │  (Vercel)         │      │  (Render)        │
│   Auth UI)  │◀─────│  /tunnel/* routes │◀─────│                  │
└─────────────┘      └──────────────────┘      └────────┬─────────┘
                                                          │
                                          ┌───────────────┼───────────────┐
                                          ▼               ▼               ▼
                                    ┌──────────┐   ┌────────────┐   ┌──────────┐
                                    │ Pinecone │   │ HF Inference│   │  Groq    │
                                    │ (Vector  │   │ API         │   │ (Llama   │
                                    │  Store)  │   │ (Embeddings)│   │  3.3)    │
                                    └──────────┘   └────────────┘   └──────────┘

```

### Data Flow

1. **Authentication**: User signs in via Clerk before accessing the dashboard.
2. **Upload**: User uploads a PDF → sent to `/tunnel/upload` (Next.js proxy route).
3. **Ingestion**: Backend extracts text, chunks it, and generates embeddings via Hugging Face's Inference API (not run locally - see engineering notes below).
4. **Storage**: Embeddings are upserted into a Pinecone vector index.
5. **Query**: User asks a question → routed through `/tunnel/ask`.
6. **Retrieval**: Backend converts the question into a vector, performs a similarity search against Pinecone, and retrieves the top-k relevant chunks.
7. **Guardrail Check**: If similarity score falls below threshold, the system returns a refusal message instead of calling the LLM.
8. **Generation**: If context is sufficient, retrieved chunks + question are sent to Llama 3.3 (via Groq) with a strict system prompt instructing it to answer *only* from provided context.
9. **Response**: Answer streams back through the tunnel to the frontend.

---

## 🔧 Tech Stack

| Layer | Technology | Why |
| --- | --- | --- |
| Frontend | Next.js 14 (App Router), React, Tailwind CSS | Server-side rendering, API routes for proxying |
| Authentication | Clerk | Production-ready auth with minimal setup overhead |
| Backend | FastAPI (Python) | Async performance, automatic OpenAPI docs |
| Embeddings | Hugging Face Inference API | Offloads memory-heavy ML inference from the backend |
| Vector Database | Pinecone | Low-latency semantic search at scale |
| LLM | Llama 3.3 (70B) via Groq | Ultra-fast inference using Groq's LPU architecture |
| Frontend Hosting | Vercel | Zero-config Next.js deployment |
| Backend Hosting | Render (Free Tier) | Simple CI/CD from GitHub |

---

## 🧠 Engineering Challenges & Solutions

This section documents real problems solved during development - not just a tutorial follow-along.

### 1. Memory Constraints on Free-Tier Hosting

**Problem**: Loading `sentence-transformers` + `torch` locally exceeded Render's 512MB RAM limit, causing repeated OOM crashes.
**Solution**: Refactored the embedding pipeline to call Hugging Face's remote Inference API instead of loading the model into local memory - reducing backend memory footprint by ~70%.

### 2. CORS Conflicts with Authentication Middleware

**Problem**: Clerk's authentication middleware intercepted cross-origin API calls and returned HTML redirect pages instead of JSON, breaking `fetch` requests to the backend.
**Solution**: Implemented Next.js API route proxying (`/tunnel/*`), so the browser only ever talks to the same-origin Next.js server. Configured `middleware.ts` to explicitly bypass auth checks for tunnel routes, allowing raw JSON/FormData to pass through to the FastAPI backend securely.

### 3. Cold-Start Latency on Free Hosting

**Problem**: Render's free tier spins down inactive services, causing up to 50-second delays on the first request - appearing as if the app was broken.
**Solution**: Added transparent UX messaging and loading states to set correct user expectations instead of hiding the delay.

### 4. Preventing Hallucinations at the Prompt Level

**Problem**: LLMs will confidently answer even when no relevant context exists.
**Solution**: Combined a similarity-score threshold check (rejecting low-confidence retrievals before they reach the LLM) with a strict system prompt constraining the model to only use provided context.

---
## 📸 Screenshots

### 🔐 Step 1 - Authentication Wall
*Unauthenticated users are blocked until they sign in*
<img width="962" height="517" alt="Sign in page" src="https://github.com/user-attachments/assets/f59f5261-c4f1-4af9-8c6d-00117565b446" />

### 🔑 Step 2 - Clerk Sign In Modal
*Supports Google OAuth and Email - secured by Clerk* 
<img width="953" height="636" alt="Sign in 2" src="https://github.com/user-attachments/assets/65c38976-3d8d-49de-8683-b2e84b88bfe9" />

### 💬 Step 3 - Live Chat With Your Document
*Upload any PDF and get grounded, verified answers instantly*
<img width="1189" height="971" alt="Image" src="https://github.com/user-attachments/assets/dea0a7b3-e324-4c3c-9953-452f705162f2" />

---

## 🚀 Local Development Setup

### Prerequisites

* Node.js 18+
* Python 3.11+
* Accounts: Clerk, Pinecone, Groq, Hugging Face

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in: GROQ_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME, HUGGINGFACEHUB_API_TOKEN

uvicorn main:app --reload --port 8000

```

### Frontend Setup

```bash
cd frontend
npm install

cp .env.example .env.local
# Fill in: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY

npm run dev

```

Visit `http://localhost:3000`

---

## 📁 Project Structure

```text
├── frontend/
│   ├── app/
│   │   ├── api/tunnel/upload/route.ts   # Proxy route to backend
│   │   ├── api/tunnel/ask/route.ts      # Proxy route to backend
│   │   ├── page.tsx                     # Main chat UI
│   │   └── middleware.ts                # Clerk auth config
│   └── package.json
├── backend/
│   ├── main.py              # FastAPI app & routes
│   ├── ingest.py            # PDF processing & embedding pipeline
│   └── requirements.txt
├── README.md
├── LICENSE
└── .gitignore

```
