import os
from datetime import datetime, timezone, date
from contextlib import contextmanager

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL не настроен")

engine: Engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT DEFAULT '',
    first_name TEXT DEFAULT 'Fenix',
    photo_url TEXT DEFAULT '',
    coins BIGINT NOT NULL DEFAULT 1000,
    xp BIGINT NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER NOT NULL DEFAULT 0,
    title TEXT DEFAULT 'Новичок',
    last_bonus TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    UNIQUE(telegram_id, code)
);

CREATE TABLE IF NOT EXISTS collection (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    fenix_code TEXT NOT NULL,
    name TEXT NOT NULL,
    rarity TEXT NOT NULL,
    UNIQUE(telegram_id, fenix_code)
);

CREATE TABLE IF NOT EXISTS game_history (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    game TEXT NOT NULL,
    result TEXT NOT NULL,
    reward BIGINT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_user ON game_history(telegram_id);
"""

def init_db():
    with engine.begin() as conn:
        for statement in SCHEMA.split(";"):
            statement = statement.strip()
            if statement:
                conn.execute(text(statement))

def _level_from_xp(xp: int) -> int:
    return max(1, xp // 500 + 1)

def _row(conn, query, params):
    return conn.execute(text(query), params).mappings().first()

def ensure_user(tg_user: dict):
    telegram_id = int(tg_user["id"])
    with engine.begin() as conn:
        row = _row(conn, "SELECT * FROM users WHERE telegram_id=:id", {"id": telegram_id})
        if not row:
            conn.execute(text("""
                INSERT INTO users (telegram_id, username, first_name, photo_url)
                VALUES (:id, :username, :first_name, :photo_url)
            """), {
                "id": telegram_id,
                "username": tg_user.get("username", ""),
                "first_name": tg_user.get("first_name", "Fenix"),
                "photo_url": tg_user.get("photo_url", "")
            })
            conn.execute(text("""
                INSERT INTO collection (telegram_id, fenix_code, name, rarity)
                VALUES (:id, 'fire', 'Fire Fenix', 'Common')
                ON CONFLICT (telegram_id, fenix_code) DO NOTHING
            """), {"id": telegram_id})
        else:
            conn.execute(text("""
                UPDATE users
                SET username=:username, first_name=:first_name, photo_url=:photo_url
                WHERE telegram_id=:id
            """), {
                "id": telegram_id,
                "username": tg_user.get("username", row["username"]),
                "first_name": tg_user.get("first_name", row["first_name"]),
                "photo_url": tg_user.get("photo_url", row["photo_url"])
            })
    return get_user(telegram_id)

def get_user(telegram_id: int):
    with engine.connect() as conn:
        return _row(conn, "SELECT * FROM users WHERE telegram_id=:id", {"id": telegram_id})

def add_xp(telegram_id, amount):
    with engine.begin() as conn:
        row = _row(conn, "SELECT xp FROM users WHERE telegram_id=:id", {"id": telegram_id})
        if not row:
            return
        xp = row["xp"] + amount
        level = _level_from_xp(xp)
        conn.execute(text("UPDATE users SET xp=:xp, level=:level WHERE telegram_id=:id"),
                     {"xp": xp, "level": level, "id": telegram_id})

def game_result(telegram_id, game, result, reward):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE users
            SET games_played=games_played+1,
                wins=wins+:win,
                losses=losses+:loss,
                coins=GREATEST(0, coins+:reward)
            WHERE telegram_id=:id
        """), {
            "win": 1 if result == "win" else 0,
            "loss": 1 if result == "loss" else 0,
            "reward": reward,
            "id": telegram_id
        })
        conn.execute(text("""
            INSERT INTO game_history (telegram_id, game, result, reward, created_at)
            VALUES (:id, :game, :result, :reward, :created)
        """), {
            "id": telegram_id, "game": game, "result": result,
            "reward": reward, "created": datetime.now(timezone.utc).isoformat()
        })
    add_xp(telegram_id, 50 if result == "win" else 15)
    check_achievements(telegram_id)

def daily_bonus(telegram_id):
    today = date.today().isoformat()
    with engine.begin() as conn:
        row = _row(conn, "SELECT last_bonus FROM users WHERE telegram_id=:id", {"id": telegram_id})
        if row and row["last_bonus"] == today:
            return False, 0
        conn.execute(text("""
            UPDATE users SET coins=coins+500, last_bonus=:today WHERE telegram_id=:id
        """), {"today": today, "id": telegram_id})
    add_xp(telegram_id, 100)
    return True, 500

def check_achievements(telegram_id):
    row = get_user(telegram_id)
    if not row:
        return
    achievements = []
    if row["games_played"] >= 1:
        achievements.append(("first_game", "Первый матч"))
    if row["wins"] >= 10:
        achievements.append(("ten_wins", "10 побед"))
    if row["level"] >= 10:
        achievements.append(("level_10", "Уровень 10"))
    with engine.begin() as conn:
        for code, title in achievements:
            conn.execute(text("""
                INSERT INTO achievements (telegram_id, code, title)
                VALUES (:id, :code, :title)
                ON CONFLICT (telegram_id, code) DO NOTHING
            """), {"id": telegram_id, "code": code, "title": title})

def get_achievements(telegram_id):
    with engine.connect() as conn:
        return [dict(x) for x in conn.execute(text("""
            SELECT code,title FROM achievements
            WHERE telegram_id=:id ORDER BY id DESC
        """), {"id": telegram_id}).mappings().all()]

def get_collection(telegram_id):
    with engine.connect() as conn:
        return [dict(x) for x in conn.execute(text("""
            SELECT fenix_code,name,rarity FROM collection
            WHERE telegram_id=:id ORDER BY id DESC
        """), {"id": telegram_id}).mappings().all()]

def leaderboard(limit=20):
    with engine.connect() as conn:
        return [dict(x) for x in conn.execute(text("""
            SELECT telegram_id, username, first_name, level, xp, wins, games_played
            FROM users ORDER BY xp DESC, wins DESC LIMIT :limit
        """), {"limit": limit}).mappings().all()]

def stats():
    with engine.connect() as conn:
        return {
            "users": conn.execute(text("SELECT COUNT(*) FROM users")).scalar_one(),
            "games": conn.execute(text("SELECT COUNT(*) FROM game_history")).scalar_one(),
            "coins": conn.execute(text("SELECT COALESCE(SUM(coins),0) FROM users")).scalar_one(),
        }
