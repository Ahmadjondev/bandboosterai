"""
Telegram Bot for User Verification
Handles user registration through Telegram via API calls
"""

import logging
import requests
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)
from decouple import config

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# API Configuration
API_BASE_URL = config("API_BASE_URL", default="http://localhost:8001")
FRONTEND_URL = config("FRONTEND_URL", default="https://localhost:3000")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command"""
    user = update.effective_user

    # Create contact sharing keyboard
    contact_keyboard = KeyboardButton(text="📱 Share Contact", request_contact=True)
    reply_markup = ReplyKeyboardMarkup(
        [[contact_keyboard]], resize_keyboard=True, one_time_keyboard=True
    )

    welcome_message = f"""
👋 Welcome to BandBooster AI, {user.first_name}!

To register or login with Telegram, please share your contact information.

🔐 Your data is secure and will only be used for account verification.

Click the button below to share your contact:
"""

    await update.message.reply_text(welcome_message, reply_markup=reply_markup)


async def handle_contact(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle contact sharing"""
    contact = update.message.contact
    user = update.effective_user

    # Verify that the contact belongs to the user
    if contact.user_id != user.id:
        await update.message.reply_text(
            "❌ Please share your own contact, not someone else's.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    try:
        # Create verification code via API
        api_url = f"{API_BASE_URL}/accounts/api/telegram/create-verification/"
        payload = {
            "telegram_id": user.id,
            "phone_number": contact.phone_number,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }

        response = requests.post(api_url, json=payload, timeout=10)
        response.raise_for_status()

        data = response.json()
        verification_code = data.get("verification_code")
        # f"Please use this code to {action}.\n\n"

        # Send verification code to user
        success_message = f"""
✅ <b>Active Code Found!</b>

You already have an active verification code:

🔑 Your code: <code>{verification_code}</code>

📝 Go to our website:
<a href="{FRONTEND_URL}/register/telegram">Register/Login here</a>

⏰ Code expires in <b>60 seconds</b>.

💡 Tip: You can copy the code by tapping on it.
"""
        await update.message.reply_text(
            success_message,
            parse_mode="HTML",
            reply_markup=ReplyKeyboardRemove(),
        )

        logger.info(
            f"Verification code generated for Telegram user {user.id}: {verification_code}"
        )

    except requests.RequestException as e:
        logger.error(f"API request error: {e}")
        await update.message.reply_text(
            "❌ An error occurred connecting to the server. Please try again later.",
            reply_markup=ReplyKeyboardRemove(),
        )
    except Exception as e:
        logger.error(f"Error creating verification: {e}")
        await update.message.reply_text(
            "❌ An error occurred. Please try again or contact support.",
            reply_markup=ReplyKeyboardRemove(),
        )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /help command"""
    help_text = """
🤖 <b>BandBooster Telegram Bot</b>

<b>Commands:</b>
/start - Start registration process
/help - Show this help message

<b>How to register:</b>
1. Send /start command
2. Share your contact
3. Receive a 6-digit verification code
4. Enter the code on BandBooster website

Need help? Contact us: bandboosterai@gmail.com
"""

    await update.message.reply_text(help_text, parse_mode="HTML")


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle text messages"""
    await update.message.reply_text(
        "Please use /start to begin the registration process."
    )


def main() -> None:
    """Start the bot"""
    # Get bot token from environment
    bot_token = config("TELEGRAM_BOT_TOKEN", default=None)

    if not bot_token:
        logger.error("TELEGRAM_BOT_TOKEN not found in environment variables!")
        logger.error("Please set TELEGRAM_BOT_TOKEN in your .env file")
        return

    # Create application
    application = Application.builder().token(bot_token).build()

    # Register handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(MessageHandler(filters.CONTACT, handle_contact))
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text)
    )

    # Start the bot
    logger.info("Bot started successfully!")
    logger.info(f"API Base URL: {API_BASE_URL}")
    logger.info(f"Frontend URL: {FRONTEND_URL}")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
