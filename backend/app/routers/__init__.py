from app.routers.auth import router as auth_router
from app.routers.characters import router as characters_router
from app.routers.chat import router as chat_router
from app.routers.credits import router as credits_router
from app.routers.gallery import router as gallery_router
from app.routers.generate import router as generate_router
from app.routers.prompt_enhance import router as prompt_enhance_router

__all__ = [
    "auth_router",
    "characters_router",
    "chat_router",
    "credits_router",
    "gallery_router",
    "generate_router",
    "prompt_enhance_router",
]
