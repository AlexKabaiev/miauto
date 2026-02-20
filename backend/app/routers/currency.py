"""Currency exchange rates API (Monobank)."""

import time
from typing import Optional

import aiohttp
from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/api/currency", tags=["currency"])

# ISO 4217 codes we care about
_CODES = {840: "USD", 978: "EUR", 985: "PLN"}
_UAH = 980

# Simple in-memory cache
_cache: dict = {"data": None, "ts": 0}


async def _fetch_rates() -> list[dict]:
    """Fetch rates from Monobank, with caching."""
    now = time.time()
    if _cache["data"] and (now - _cache["ts"]) < settings.CURRENCY_CACHE_TTL:
        return _cache["data"]

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(settings.MONOBANK_API_URL, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status != 200:
                    return _cache.get("data") or []
                raw = await resp.json()
    except Exception:
        return _cache.get("data") or []

    rates = []
    for item in raw:
        code_a = item.get("currencyCodeA")
        code_b = item.get("currencyCodeB")
        if code_b != _UAH or code_a not in _CODES:
            continue
        rates.append({
            "currency": _CODES[code_a],
            "buy": item.get("rateBuy"),
            "sell": item.get("rateSell"),
            "cross": item.get("rateCross"),
            "date": item.get("date"),
        })

    if rates:
        _cache["data"] = rates
        _cache["ts"] = now

    return rates


@router.get("/rates")
async def get_rates():
    """Return current USD, EUR, PLN exchange rates."""
    rates = await _fetch_rates()
    return {"rates": rates}
