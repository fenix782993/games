import asyncio
import os
import logging
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, Router
from aiogram.filters import CommandStart
from aiogram.types import Message, WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

load_dotenv()
logging.basicConfig(level=logging.INFO)

TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL", "http://127.0.0.1:8000")

router = Router()

@router.message(CommandStart())
async def start(message: Message):
    name = message.from_user.first_name or "Fenix"
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🔥 ОТКРЫТЬ FENIX WORLD",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )],
        [
            InlineKeyboardButton(text="🏆 Рейтинг", callback_data="leaderboard"),
            InlineKeyboardButton(text="🎁 Бонус", callback_data="bonus")
        ]
    ])
    await message.answer(
        f"🔥 <b>FENIX WORLD</b>\n\n"
        f"Привет, <b>{name}</b>!\n\n"
        f"Твой игровой мир уже ждёт тебя.\n"
        f"🎮 Игры • 🐦 Коллекция • 🏆 Рейтинг • 🛡️ Кланы\n\n"
        f"Нажми кнопку ниже:",
        reply_markup=kb,
        parse_mode="HTML"
    )

async def main():
    if not TOKEN:
        raise RuntimeError("BOT_TOKEN не найден в .env")
    bot = Bot(TOKEN)
    dp = Dispatcher()
    dp.include_router(router)
    print("🔥 FENIX WORLD BOT ЗАПУЩЕН")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
