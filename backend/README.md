# Mr. Robert's Fries — Backend API

FastAPI + MongoDB (Beanie) + Paystack backend for the Mr. Robert's Fries ordering experience.

## Tech Stack
- **FastAPI** — async REST API
- **Motor + Beanie** — async MongoDB ODM
- **Pydantic v2** — validation & settings
- **Paystack** — payments (MoMo, card, bank)
- **JWT** — admin/staff auth
- **Pillow** — image optimization

## Quick Start

### 1. Setup
```bash
cp .env.example .env
# edit .env with your Paystack keys
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt