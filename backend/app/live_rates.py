"""
Indicative commodity rates in INR for display (India / Punjab region).

1) **Goodreturns** (Gurgaon gold + silver pages) via **cloudscraper** — city retail-style
   board numbers when `GOODRETURNS_ENABLED` is on (default). Plain httpx hits Cloudflare 403.
2) GoldAPI **INR** (`/api/XAU/INR`, `/api/XAG/INR`) — uses `price_gram_24k` / `price_gram_22k`
   when provided, else `price` (INR per troy oz) → ₹/g.
3) GoldAPI **USD** + live USD/INR — convert international spot troy oz to ₹/g.
4) **metals.live** USD spot + USD/INR — fallback.

Set **GOLDAPI_API_KEY** (from https://www.goldapi.io/) for fallback when Goodreturns fails.
"""
from __future__ import annotations

import logging
import os
import re
import threading
import time
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

_lock = threading.Lock()
# Last time we attempted a network fetch (throttles parallel calls and backoff on failure).
_last_refresh_attempt: float = 0.0
# Last time we successfully applied live rates to the store (freshness window for TTL).
_last_refresh_ok: float = 0.0
# How long successful data is considered fresh before we try to refresh again (default 1h for storefront UX).
_TTL_SEC = max(60, int(os.getenv("METAL_RATES_TTL_SEC", "3600")))
# After a failed fetch, retry after this many seconds (does not block for the full TTL).
_MIN_RETRY_AFTER_FAIL_SEC = max(15, int(os.getenv("METAL_RATES_RETRY_AFTER_FAIL_SEC", "120")))

TROY_OZ_G = 31.1034768

_GOLD_MIN = 2000.0
_GOLD_MAX = 50000.0
_SILVER_MIN = 40.0
_SILVER_MAX = 1200.0


def _api_key() -> str:
    return (os.getenv("GOLDAPI_API_KEY") or os.getenv("GOLDAPI_KEY") or "").strip()


def _goodreturns_enabled() -> bool:
    v = (os.getenv("GOODRETURNS_ENABLED") or "1").strip().lower()
    return v in ("1", "true", "yes", "on")


def _goodreturns_gold_url() -> str:
    return (
        os.getenv("GOODRETURNS_GOLD_URL")
        or "https://www.goodreturns.in/gold-rates/gurgaon.html"
    ).strip()


def _goodreturns_silver_url() -> str:
    return (
        os.getenv("GOODRETURNS_SILVER_URL")
        or "https://www.goodreturns.in/silver-rates/gurgaon.html"
    ).strip()


def _inr_amount_from_match(s: str) -> float:
    """Parse Indian comma-grouped numbers to float (e.g. 14,295 → 14295)."""
    digits = re.sub(r"\D", "", s)
    if not digits:
        raise ValueError("empty amount")
    return float(digits)


def _goodreturns_fetch_html(url: str, scraper: Any = None) -> Optional[str]:
    """Fetch page HTML. Pass a shared `cloudscraper` session for multiple URLs."""
    try:
        import cloudscraper

        client = scraper or cloudscraper.create_scraper()
        r = client.get(url, timeout=45.0)
        if r.status_code != 200:
            logger.warning("goodreturns GET %s → HTTP %s", url, r.status_code)
            return None
        if len(r.text) < 5000 or "Attention Required!" in r.text[:3000]:
            logger.warning("goodreturns: blocked or short response for %s", url)
            return None
        return r.text
    except ImportError:
        logger.warning("goodreturns: install cloudscraper (see requirements.txt)")
        return None
    except Exception as e:
        logger.warning("goodreturns fetch %s: %s", url, e)
        return None


def _parse_goodreturns_gold(html: str) -> tuple[Optional[float], Optional[float]]:
    """24k / 22k ₹/g from intro paragraph."""
    m24 = re.search(
        r"(?:&#x20b9;|₹)\s*([\d,]+)</strong>\s*per gram for 24\s*karat",
        html,
        re.IGNORECASE,
    )
    m22 = re.search(
        r"(?:&#x20b9;|₹)\s*([\d,]+)</strong>\s*per gram for 22\s*karat",
        html,
        re.IGNORECASE,
    )
    g24 = g22 = None
    if m24:
        try:
            g24 = _inr_amount_from_match(m24.group(1))
        except ValueError:
            pass
    if m22:
        try:
            g22 = _inr_amount_from_match(m22.group(1))
        except ValueError:
            pass
    return g24, g22


def _parse_goodreturns_silver(html: str) -> Optional[float]:
    """₹/g for 1g row on silver city page."""
    anchor = html.find("Per Gram/Kg")
    chunk = html[anchor:] if anchor >= 0 else html
    # Markup varies: <td><span>&#x20b9;</span>275</td> or <td>&#x20b9;275</td>
    m = re.search(
        r"<td>\s*1\s*</td>\s*<td>\s*(?:<span>)?&#x20b9;(?:</span>)?\s*([\d,]+)\s*</td>",
        chunk,
        re.IGNORECASE,
    )
    if not m:
        m = re.search(r"<td>\s*1\s*</td>\s*<td>\s*₹\s*([\d,]+)\s*</td>", chunk)
    if not m:
        return None
    try:
        return _inr_amount_from_match(m.group(1))
    except ValueError:
        return None


def _usd_inr() -> Optional[float]:
    urls = [
        "https://open.er-api.com/v6/latest/USD",
        "https://api.frankfurter.app/latest?from=USD&to=INR",
        "https://api.exchangerate.host/latest?base=USD&symbols=INR",
    ]
    for url in urls:
        try:
            r = httpx.get(url, timeout=15.0)
            if r.status_code != 200:
                continue
            data = r.json()
            rates = data.get("rates") or {}
            inr = rates.get("INR")
            if inr is not None:
                return float(inr)
        except Exception as e:
            logger.debug("usd_inr %s: %s", url, e)
    return None


def _goldapi_request(symbol: str, currency: str) -> Optional[dict[str, Any]]:
    key = _api_key()
    if not key:
        return None
    try:
        r = httpx.get(
            f"https://www.goldapi.io/api/{symbol}/{currency}",
            headers={"x-access-token": key},
            timeout=15.0,
        )
        if r.status_code != 200:
            logger.warning("goldapi %s/%s HTTP %s", symbol, currency, r.status_code)
            return None
        return r.json()
    except Exception as e:
        logger.warning("goldapi %s/%s: %s", symbol, currency, e)
        return None


def _first_float(data: dict[str, Any], *keys: str) -> Optional[float]:
    for k in keys:
        v = data.get(k)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                continue
    return None


def _gram_from_goldapi_xau_inr(data: dict[str, Any]) -> tuple[Optional[float], Optional[float]]:
    g24 = _first_float(data, "price_gram_24k", "price_gram_24K", "price_gram_24")
    g22 = _first_float(data, "price_gram_22k", "price_gram_22K", "price_gram_22")
    if g24 is not None and g24 > 0:
        if g22 is None or g22 <= 0:
            g22 = g24 * (22.0 / 24.0)
        return g24, g22
    if (data.get("currency") or "").upper() != "INR":
        return None, None
    oz = data.get("price")
    if oz is None:
        return None, None
    try:
        per_oz = float(oz)
    except (TypeError, ValueError):
        return None, None
    per_g = per_oz / TROY_OZ_G
    return per_g, per_g * (22.0 / 24.0)


def _gram_silver_from_goldapi_xag_inr(data: dict[str, Any]) -> Optional[float]:
    g = _first_float(data, "price_gram_24k", "price_gram_24K", "price_gram_24")
    if g is not None and g > 0:
        return g
    if (data.get("currency") or "").upper() != "INR":
        return None
    oz = data.get("price")
    if oz is None:
        return None
    try:
        return float(oz) / TROY_OZ_G
    except (TypeError, ValueError):
        return None


def _inr_per_gram_from_usd_oz(usd_per_oz: float, usd_inr: float) -> float:
    return (usd_per_oz * usd_inr) / TROY_OZ_G


def _metals_live_spot_usd(path: str) -> Optional[float]:
    try:
        r = httpx.get(f"https://api.metals.live/v1/spot/{path}", timeout=15.0)
        if r.status_code != 200:
            return None
        j: Any = r.json()
        if isinstance(j, (int, float)):
            return float(j)
        if isinstance(j, dict):
            for k in ("price", "spot", "value", "usd"):
                if k in j and j[k] is not None:
                    return float(j[k])
        if isinstance(j, list) and len(j) > 0:
            return float(j[0])
    except Exception as e:
        logger.debug("metals.live %s: %s", path, e)
    return None


def _goldapi_usd_oz(symbol: str) -> Optional[float]:
    data = _goldapi_request(symbol, "USD")
    if not data:
        return None
    p = data.get("price")
    if p is None:
        return None
    try:
        return float(p)
    except (TypeError, ValueError):
        return None


def _valid_gold(v: float) -> bool:
    return _GOLD_MIN <= v <= _GOLD_MAX


def _valid_silver(v: float) -> bool:
    return _SILVER_MIN <= v <= _SILVER_MAX


def _try_goodreturns() -> Optional[dict[str, float]]:
    if not _goodreturns_enabled():
        return None
    try:
        import cloudscraper

        shared = cloudscraper.create_scraper()
    except ImportError:
        shared = None

    gold_html = _goodreturns_fetch_html(_goodreturns_gold_url(), scraper=shared)
    if not gold_html:
        return None
    g24, g22 = _parse_goodreturns_gold(gold_html)
    if g24 is None or g22 is None or g24 <= 0 or g22 <= 0:
        logger.warning("goodreturns: could not parse gold 24k/22k from page")
        return None
    if not _valid_gold(g24) or not _valid_gold(g22):
        logger.warning("goodreturns: gold parsed values out of plausible range")
        return None

    silver: Optional[float] = None
    sil_html = _goodreturns_fetch_html(_goodreturns_silver_url(), scraper=shared)
    if sil_html:
        silver = _parse_goodreturns_silver(sil_html)
    if silver is None or not _valid_silver(silver):
        silver = round(max(1.0, g24 * 0.012), 2)

    g24r = round(g24, 2)
    g22r = round(g22, 2)
    sr = round(silver, 2)
    diamond = max(1000.0, round(g24r * 8.23, 0))
    logger.info("live_rates: Goodreturns Gurgaon (gold + silver pages)")
    return {
        "gold_24k": g24r,
        "gold_22k": g22r,
        "silver": sr,
        "diamond": diamond,
    }


def _try_goldapi_inr_path() -> Optional[dict[str, float]]:
    if not _api_key():
        return None
    xau = _goldapi_request("XAU", "INR")
    if not xau:
        return None
    g24, g22 = _gram_from_goldapi_xau_inr(xau)
    if g24 is None or g22 is None or g24 <= 0:
        return None
    if not _valid_gold(g24) or not _valid_gold(g22):
        logger.warning("live_rates: GoldAPI INR gold out of plausible range")
        return None

    g24r = round(g24, 2)
    g22r = round(g22, 2)

    silver: float
    xag = _goldapi_request("XAG", "INR")
    if xag:
        sg = _gram_silver_from_goldapi_xag_inr(xag)
        if sg is not None and _valid_silver(sg):
            silver = round(sg, 2)
        else:
            silver = round(max(1.0, g24r * 0.012), 2)
    else:
        silver = round(max(1.0, g24r * 0.012), 2)

    diamond = max(1000.0, round(g24r * 8.23, 0))
    logger.info("live_rates: GoldAPI INR (spot in rupees)")
    return {
        "gold_24k": g24r,
        "gold_22k": g22r,
        "silver": silver,
        "diamond": diamond,
    }


def _try_usd_spot_path() -> Optional[dict[str, float]]:
    usd_inr = _usd_inr()
    if not usd_inr or usd_inr <= 0:
        logger.warning("live_rates: could not load USD/INR")
        return None

    xau_usd = _goldapi_usd_oz("XAU") or _metals_live_spot_usd("gold")
    if not xau_usd or xau_usd <= 0:
        logger.warning("live_rates: could not load gold USD/oz")
        return None

    gold_24 = _inr_per_gram_from_usd_oz(xau_usd, usd_inr)
    gold_22 = gold_24 * (22.0 / 24.0)
    if not _valid_gold(gold_24) or not _valid_gold(gold_22):
        logger.warning("live_rates: converted gold out of plausible range")
        return None

    g24r = round(gold_24, 2)
    g22r = round(gold_22, 2)

    xag_usd = _goldapi_usd_oz("XAG") or _metals_live_spot_usd("silver")
    if xag_usd and xag_usd > 0:
        sv = _inr_per_gram_from_usd_oz(xag_usd, usd_inr)
        if _valid_silver(sv):
            silver = round(sv, 2)
        else:
            silver = round(max(1.0, g24r * 0.012), 2)
    else:
        silver = round(max(1.0, g24r * 0.012), 2)

    diamond = max(1000.0, round(g24r * 8.23, 0))
    logger.info("live_rates: USD/oz × USD/INR (international spot)")
    return {
        "gold_24k": g24r,
        "gold_22k": g22r,
        "silver": silver,
        "diamond": diamond,
    }


def _compute_rates() -> Optional[dict[str, float]]:
    rates = _try_goodreturns()
    if rates:
        return rates
    rates = _try_goldapi_inr_path()
    if rates:
        return rates
    return _try_usd_spot_path()


def refresh_if_stale() -> None:
    """Update in-memory rates when TTL expired; retry soon after failures (not after full TTL)."""
    global _last_refresh_attempt, _last_refresh_ok
    from app.store import metal_rates

    now = time.time()
    with _lock:
        needs_refresh = _last_refresh_ok <= 0.0 or (now - _last_refresh_ok) >= _TTL_SEC
        if not needs_refresh:
            return
        # Avoid hammering Goodreturns/API when the last attempt failed: short gap, not full TTL.
        if (
            _last_refresh_attempt > 0.0
            and (now - _last_refresh_attempt) < _MIN_RETRY_AFTER_FAIL_SEC
        ):
            return
        _last_refresh_attempt = now

    new_rates = None
    try:
        new_rates = _compute_rates()
    except Exception as e:
        logger.exception("live_rates refresh: %s", e)

    if not new_rates:
        return

    with _lock:
        _last_refresh_ok = time.time()
        for k, v in new_rates.items():
            if k in metal_rates and v is not None:
                metal_rates[k] = float(v)
