import os
import random
import hashlib
import hmac
from urllib.parse import parse_qsl
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from database.db import (
    init_db, ensure_user, get_user, daily_bonus, game_result,
    get_achievements, get_collection, leaderboard, stats
)

load_dotenv()
init_db()

app = FastAPI(title="Fenix World API", version="1.0.0")

FRONTEND = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/static", StaticFiles(directory=FRONTEND), name="static")

BOT_TOKEN = os.getenv("BOT_TOKEN", "")

def validate_webapp_data(init_data: str):
    if not init_data:
        raise HTTPException(401, "Telegram initData отсутствует")
    if not BOT_TOKEN:
        raise HTTPException(500, "BOT_TOKEN не настроен")

    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise HTTPException(401, "Некорректные Telegram данные")

    data_check_string = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calculated, received_hash):
        raise HTTPException(401, "Telegram подпись не прошла проверку")

    import json
    user = json.loads(pairs.get("user", "{}"))
    if not user.get("id"):
        raise HTTPException(401, "Пользователь Telegram не найден")
    return user

def auth_user(request: Request):
    init_data = request.headers.get("X-Telegram-Init-Data", "")
    return validate_webapp_data(init_data)

@app.get("/health")
def health():
    return {"status": "ok", "service": "fenix-world"}

@app.get("/")
def index():
    return FileResponse(os.path.join(FRONTEND, "index.html"))

@app.get("/api/me")
def me(request: Request):
    tg = auth_user(request)
    user = ensure_user(tg)
    return {
        "user": dict(user),
        "achievements": get_achievements(tg["id"]),
        "collection": get_collection(tg["id"])
    }

@app.post("/api/bonus")
def bonus(request: Request):
    tg = auth_user(request)
    ok, reward = daily_bonus(tg["id"])
    return {"success": ok, "reward": reward, "user": dict(get_user(tg["id"]))}

@app.get("/api/leaderboard")
def get_leaderboard():
    return {"items": leaderboard()}

@app.get("/api/admin/stats")
def admin_stats(request: Request):
    tg = auth_user(request)
    admin_ids = {int(x.strip()) for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip()}
    if tg["id"] not in admin_ids:
        raise HTTPException(403, "Admin only")
    return stats()

@app.post("/api/game/{game}")
def play_game(game: str, request: Request):
    tg = auth_user(request)
    allowed = {"dice", "reaction", "mines", "race", "football"}
    if game not in allowed:
        raise HTTPException(404, "Игра не найдена")

    # V1: развлекательные серверные результаты без денежных ставок.
    if game == "dice":
        player = random.randint(1, 6)
        bot = random.randint(1, 6)
        result = "win" if player > bot else "loss" if player < bot else "draw"
        reward = 100 if result == "win" else 0
        payload = {"player": player, "bot": bot}
    elif game == "reaction":
        result = random.choice(["win", "win", "loss"])
        reward = 80 if result == "win" else 0
        payload = {"reaction_ms": random.randint(180, 700)}
    elif game == "mines":
        safe = random.random() > 0.35
        result = "win" if safe else "loss"
        reward = 150 if safe else 0
        payload = {"safe": safe}
    elif game == "race":
        player = random.randint(1, 100)
        bot = random.randint(1, 100)
        result = "win" if player > bot else "loss"
        reward = 120 if result == "win" else 0
        payload = {"player": player, "bot": bot}
    else:
        player = random.randint(1, 3)
        bot = random.randint(1, 3)
        result = "win" if player > bot else "loss" if player < bot else "draw"
        reward = 110 if result == "win" else 0
        payload = {"player": player, "bot": bot}

    game_result(tg["id"], game, result, reward)
    return {
        "game": game,
        "result": result,
        "reward": reward,
        "data": payload,
        "user": dict(get_user(tg["id"]))
    }
