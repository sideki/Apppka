from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import uuid
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import List, Optional

# JWT
JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---- Health Check ----

@api_router.get("/")
async def root():
    return {"status": "ok", "app": "Raport Pracy API"}

@api_router.get("/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception:
        return {"status": "unhealthy", "database": "disconnected"}

# ---- Auth Helper ----

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Nie zalogowano")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Nieprawidlowy token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Uzytkownik nie znaleziony")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token wygasl")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Brak uprawnien administratora")
    return user

# ---- Models ----

class LoginRequest(BaseModel):
    email: str
    password: str

class QuestionCreate(BaseModel):
    text: str
    category: str
    order: int = 0

class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    category: Optional[str] = None
    order: Optional[int] = None
    active: Optional[bool] = None

class AnswerItem(BaseModel):
    question_id: str
    question_text: str
    answer: str

class ReportCreate(BaseModel):
    answers: List[AnswerItem]
    date: str

class SettingsUpdate(BaseModel):
    notification_time: Optional[str] = None
    notification_text: Optional[str] = None
    close_reminder_text: Optional[str] = None

# ---- Auth Endpoints ----

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Nieprawidlowy email lub haslo")
    token = create_access_token(str(user["_id"]), user["email"], user["role"])
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {
        "id": user["_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    }

# ---- Questions Endpoints ----

@api_router.get("/questions")
async def get_questions(request: Request):
    await get_current_user(request)
    questions = []
    cursor = db.questions.find({"active": True}).sort("order", 1)
    async for q in cursor:
        q["id"] = str(q["_id"])
        del q["_id"]
        questions.append(q)
    return questions

@api_router.get("/questions/all")
async def get_all_questions(request: Request):
    await require_admin(request)
    questions = []
    cursor = db.questions.find({}).sort([("category", 1), ("order", 1)])
    async for q in cursor:
        q["id"] = str(q["_id"])
        del q["_id"]
        questions.append(q)
    return questions

@api_router.post("/questions")
async def create_question(req: QuestionCreate, request: Request):
    await require_admin(request)
    if req.category not in ["daily", "saturday", "first_saturday"]:
        raise HTTPException(status_code=400, detail="Nieprawidlowa kategoria")
    doc = {
        "text": req.text,
        "category": req.category,
        "order": req.order,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.questions.insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "text": doc["text"],
        "category": doc["category"],
        "order": doc["order"],
        "active": doc["active"],
        "created_at": doc["created_at"]
    }

@api_router.put("/questions/{question_id}")
async def update_question(question_id: str, req: QuestionUpdate, request: Request):
    await require_admin(request)
    update = {}
    if req.text is not None:
        update["text"] = req.text
    if req.category is not None:
        if req.category not in ["daily", "saturday", "first_saturday"]:
            raise HTTPException(status_code=400, detail="Nieprawidlowa kategoria")
        update["category"] = req.category
    if req.order is not None:
        update["order"] = req.order
    if req.active is not None:
        update["active"] = req.active
    if not update:
        raise HTTPException(status_code=400, detail="Brak danych do aktualizacji")
    result = await db.questions.update_one({"_id": ObjectId(question_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pytanie nie znalezione")
    return {"success": True}

@api_router.delete("/questions/{question_id}")
async def delete_question(question_id: str, request: Request):
    await require_admin(request)
    result = await db.questions.delete_one({"_id": ObjectId(question_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pytanie nie znalezione")
    return {"success": True}

# ---- Reports Endpoints ----

@api_router.get("/reports/open")
async def get_open_report(request: Request):
    user = await get_current_user(request)
    report = await db.reports.find_one(
        {"user_id": user["_id"], "status": "open"},
        {"_id": 0}
    )
    return report

@api_router.post("/reports")
async def create_report(req: ReportCreate, request: Request):
    user = await get_current_user(request)
    open_report = await db.reports.find_one({"user_id": user["_id"], "status": "open"})
    if open_report:
        raise HTTPException(status_code=400, detail="Musisz zamknac poprzedni raport przed rozpoczeciem nowego")
    if not req.answers:
        raise HTTPException(status_code=400, detail="Raport musi zawierac odpowiedzi")
    report_id = str(uuid.uuid4())
    doc = {
        "id": report_id,
        "user_id": user["_id"],
        "user_name": user.get("name", ""),
        "date": req.date,
        "answers": [a.dict() for a in req.answers],
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "closed_at": None
    }
    await db.reports.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.post("/reports/{report_id}/close")
async def close_report(report_id: str, request: Request):
    user = await get_current_user(request)
    query = {"id": report_id}
    if user["role"] != "admin":
        query["user_id"] = user["_id"]
    result = await db.reports.update_one(
        query,
        {"$set": {"status": "closed", "closed_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Raport nie znaleziony")
    return {"success": True}

@api_router.get("/reports")
async def get_reports(request: Request, skip: int = 0, limit: int = 50):
    user = await get_current_user(request)
    query = {} if user["role"] == "admin" else {"user_id": user["_id"]}
    total = await db.reports.count_documents(query)
    cursor = db.reports.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    reports = await cursor.to_list(limit)
    return {"reports": reports, "total": total, "skip": skip, "limit": limit}

@api_router.get("/reports/{report_id}")
async def get_report(report_id: str, request: Request):
    user = await get_current_user(request)
    query = {"id": report_id}
    if user["role"] != "admin":
        query["user_id"] = user["_id"]
    report = await db.reports.find_one(query, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Raport nie znaleziony")
    return report

# ---- Settings Endpoints ----

@api_router.get("/settings")
async def get_settings(request: Request):
    await get_current_user(request)
    settings = await db.settings.find_one({"key": "app_settings"}, {"_id": 0, "key": 0})
    if not settings:
        return {
            "notification_time": "08:00",
            "notification_text": "Czas na raport dzienny!",
            "close_reminder_text": "Pamietaj o zamknieciu raportu!"
        }
    return settings

@api_router.put("/settings")
async def update_settings(req: SettingsUpdate, request: Request):
    await require_admin(request)
    update = {}
    if req.notification_time is not None:
        update["notification_time"] = req.notification_time
    if req.notification_text is not None:
        update["notification_text"] = req.notification_text
    if req.close_reminder_text is not None:
        update["close_reminder_text"] = req.close_reminder_text
    if not update:
        raise HTTPException(status_code=400, detail="Brak danych")
    await db.settings.update_one({"key": "app_settings"}, {"$set": update}, upsert=True)
    return {"success": True}

# ---- Seed Data ----

async def seed_data():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@raport.pl")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    user_email = os.environ.get("USER_EMAIL", "pracownik@raport.pl")
    user_password = os.environ.get("USER_PASSWORD", "Praca123!")

    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Administrator",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Admin account created")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    existing = await db.users.find_one({"email": user_email})
    if not existing:
        await db.users.insert_one({
            "email": user_email,
            "password_hash": hash_password(user_password),
            "name": "Pracownik",
            "role": "user",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("User account created")
    elif not verify_password(user_password, existing["password_hash"]):
        await db.users.update_one({"email": user_email}, {"$set": {"password_hash": hash_password(user_password)}})

    count = await db.questions.count_documents({})
    if count == 0:
        await db.questions.insert_many([
            {"text": "Jakie zadania wykonales dzisiaj?", "category": "daily", "order": 1, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"text": "Czy napotkales jakies problemy?", "category": "daily", "order": 2, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"text": "Jakie sa plany na jutro?", "category": "daily", "order": 3, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"text": "Podsumowanie tygodnia pracy:", "category": "saturday", "order": 1, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"text": "Co mozna poprawic w przyszlym tygodniu?", "category": "saturday", "order": 2, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"text": "Podsumowanie miesiaca:", "category": "first_saturday", "order": 1, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"text": "Cele na nastepny miesiac:", "category": "first_saturday", "order": 2, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ])
        logger.info("Default questions seeded")

    settings = await db.settings.find_one({"key": "app_settings"})
    if not settings:
        await db.settings.insert_one({
            "key": "app_settings",
            "notification_time": "08:00",
            "notification_text": "Czas na raport dzienny!",
            "close_reminder_text": "Pamietaj o zamknieciu raportu!"
        })

    await db.users.create_index("email", unique=True)
    logger.info("Seed complete")

@app.on_event("startup")
async def startup():
    await seed_data()

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
