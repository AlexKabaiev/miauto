"""MIAUTO — Auto Parts Ordering Desk.

Entry point for the FastAPI application.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import create_tables
from app.routers.clients import router as clients_router
from app.routers.currency import router as currency_router
from app.routers.dashboard import router as dashboard_router
from app.routers.orders import router as orders_router
from app.routers.products import products_router, suppliers_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    create_tables()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Стіл замовлень автозапчастин",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # Vite dev server
        "http://localhost:3000",
        f"http://localhost:{settings.PORT}",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register API routers ---------------------------------------------------
app.include_router(orders_router)
app.include_router(clients_router)
app.include_router(products_router)
app.include_router(suppliers_router)
app.include_router(currency_router)
app.include_router(dashboard_router)


# --- Health check ------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}


# --- Serve React static build (production) -----------------------------------
_frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")


# --- Run directly with `python -m app.main` ----------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
