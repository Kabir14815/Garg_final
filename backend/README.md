# Garg Jewellers API (FastAPI)

## Setup

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

## Endpoints

- **Products:** `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}`
- **Metal rates:** `GET/PUT /api/metal-rates`
- **Auth:** `POST /api/auth/login`, `POST /api/auth/register`

When metal rates are updated via `PUT /api/metal-rates`, the frontend fetches the new rates and all product prices (computed from weight × rate + making charges + GST) update automatically.

## Admin portal credentials

The **Admin** section on the website is restricted to admin users. Default credentials (created on first run if no users exist):

- **Email:** `admin@garg.com`
- **Password:** `1234`

Log in at **Login** in the header, then open **Admin** (visible only when logged in as admin). To add more admins, add their email to `ADMIN_EMAILS` in `app/auth.py`.
