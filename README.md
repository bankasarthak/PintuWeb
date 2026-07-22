# PintuWeb

Full-stack AI companion platform. Reuses PintuV3 GPU pods for generation.

## Stack
- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL + JWT auth
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + Shadcn/ui

## Project Structure
```
PintuWeb/
├── backend/          FastAPI application
├── frontend/         Next.js application
└── docker-compose.yml
```

## Quick Start (Development)

### 1. Prerequisites
- Docker + Docker Compose
- Node.js 22+
- Python 3.11+
- A running Ollama instance with the Qwen3.5 model

### 2. Backend setup
```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, OLLAMA_URL

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup
```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local if needed

npm install
npm run dev
```

### 4. Or use Docker Compose
```bash
# Copy and edit env files first
cp backend/.env.example backend/.env

docker compose up --build
```

Frontend: http://localhost:3000
Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL async URL (e.g. `postgresql+asyncpg://user:pass@host/db`) |
| `SECRET_KEY` | JWT signing key (min 32 chars, random) |
| `OLLAMA_URL` | URL to running Ollama instance |
| `CORS_ORIGINS` | JSON array of allowed frontend origins |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL (default: http://localhost:8000) |

## Production (AWS)
1. Provision RDS PostgreSQL instance
2. Set `DATABASE_URL` to the RDS endpoint
3. Deploy backend to EC2/ECS, frontend to Vercel/Amplify
4. Set `OLLAMA_URL` to the Vast.ai pod tunnel URL
5. Set `CORS_ORIGINS` to your production frontend domain
