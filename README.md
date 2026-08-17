# 🔥 FENIX WORLD V1 — GitHub + Render + PostgreSQL

Готовая база Fenix World для деплоя через GitHub и Render.

## Архитектура

```text
GitHub
  ├── fenix-world-web  → Render Web Service → Mini App + FastAPI
  ├── fenix-world-bot  → Render Worker → Telegram Bot
  └── fenix-world-db   → Render PostgreSQL
```

## 1. GitHub

Создай репозиторий, например `fenix-world`.

В папке проекта:

```cmd
git init
git add .
git commit -m "Fenix World V1"
git branch -M main
git remote add origin https://github.com/USERNAME/fenix-world.git
git push -u origin main
```

## 2. Render

В Render выбери **New → Blueprint** и подключи GitHub-репозиторий.

Render прочитает `render.yaml` и создаст:

- `fenix-world-web`
- `fenix-world-bot`
- `fenix-world-db`

## 3. Environment Variables

Для Web Service:

```text
BOT_TOKEN=токен Telegram бота
ADMIN_IDS=твой Telegram ID
WEBAPP_URL=https://fenix-world-web.onrender.com
DATABASE_URL=создаётся Render автоматически
```

Для Worker:

```text
BOT_TOKEN=тот же токен
WEBAPP_URL=https://fenix-world-web.onrender.com
DATABASE_URL=создаётся Render автоматически
```

`DATABASE_URL` не нужно вручную копировать, потому что `render.yaml` связывает оба сервиса с PostgreSQL.

## 4. Telegram

После первого деплоя получишь адрес:

```text
https://fenix-world-web.onrender.com
```

Его нужно указать как URL Mini App в BotFather.

После запуска бота:

```text
/start
```

→ `🔥 ОТКРЫТЬ FENIX WORLD`

## 5. Важно

Render Worker постоянно запускает polling бота.

Web Service отдаёт Mini App и API.

PostgreSQL хранит пользователей, Coins, XP, игры, достижения и коллекцию между деплоями.

## Локальная разработка

Нужен PostgreSQL и:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/fenixworld
BOT_TOKEN=
WEBAPP_URL=http://127.0.0.1:8000
ADMIN_IDS=
```

Запуск API:

```cmd
python run_api.py
```

Запуск бота:

```cmd
python run_bot.py
```

## V1 включает

- Telegram Bot
- Mini App
- FastAPI
- PostgreSQL
- Telegram initData validation
- профиль
- Coins
- XP / уровни
- Daily Bonus
- достижения
- рейтинг
- коллекцию Fenix
- Dice
- Reaction
- Mines
- Race
- Football
- health check
- Render Blueprint

## Следующий этап

- друзья
- PvP
- кланы
- события
- сезоны
- Battle Pass
- Fenix World
- AI
- расширенная админка
