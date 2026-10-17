"""
scrape_clinics.py — Cào dữ liệu phòng khám thú y từ Google Places API
=======================================================================
Sử dụng Text Search (New) API của Google Cloud.
Quét theo cụm tọa độ trọng điểm toàn Việt Nam.

Cách dùng:
    pip install requests pymysql python-dotenv
    python scrape_clinics.py

Yêu cầu .env:
    GOOGLE_PLACES_API_KEY=...
    DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
"""

import os
import time
import json
import logging
import requests
import pymysql
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Cấu hình ─────────────────────────────────────────────────────────────────

API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

# Cụm tọa độ trọng điểm Việt Nam (lat, lng, tên thành phố)
SEARCH_CLUSTERS = [
    # Miền Bắc
    (21.0278, 105.8342, "Hà Nội"),
    (20.8449, 106.6881, "Hải Phòng"),
    (21.3860, 105.4048, "Vĩnh Phúc"),
    (20.9598, 106.7285, "Hải Dương"),
    (21.1667, 106.0667, "Bắc Ninh"),

    # Miền Trung
    (16.0678, 108.2208, "Đà Nẵng"),
    (16.4637, 107.5909, "Huế"),
    (15.8794, 108.3350, "Quảng Nam"),
    (14.0583, 108.2772, "Quy Nhơn"),

    # Tây Nguyên
    (12.6667, 108.0333, "Buôn Mê Thuột"),
    (11.9404, 108.4583, "Đà Lạt"),

    # Miền Nam - TP.HCM các quận
    (10.7769, 106.7009, "TP HCM Trung Tâm"),
    (10.8232, 106.6297, "TP HCM Tân Bình"),
    (10.7333, 106.6833, "TP HCM Quận 7"),
    (10.8000, 106.7200, "TP HCM Thủ Đức"),

    # Miền Nam - tỉnh lân cận
    (10.9804, 106.6519, "Bình Dương"),
    (10.9450, 106.8243, "Đồng Nai"),
    (10.3579, 107.0843, "Vũng Tàu"),
    (10.0452, 105.7469, "Cần Thơ"),
    (10.5417, 106.4142, "Long An"),
]

SEARCH_KEYWORDS = [
    "phòng khám thú y",
    "bệnh viện thú y",
    "veterinary clinic",
]

PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText"

# ── Kết nối DB ────────────────────────────────────────────────────────────────

def get_db():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "pet_emergency"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


# ── Ensure table ──────────────────────────────────────────────────────────────

def ensure_clinics_table(conn):
    with conn.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clinics (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                google_place_id VARCHAR(255) NULL,
                name VARCHAR(500) NOT NULL,
                address TEXT,
                phone VARCHAR(50),
                location POINT NOT NULL /*!80003 SRID 4326 */,
                rating DECIMAL(2,1) DEFAULT 0,
                opening_hours JSON,
                status ENUM('approved','pending') DEFAULT 'pending',
                source ENUM('google_maps','user_contributed') DEFAULT 'user_contributed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uk_place_id (google_place_id),
                SPATIAL INDEX idx_location (location)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)
    conn.commit()
    logger.info("Bảng clinics đã sẵn sàng.")


# ── Google Places Text Search ─────────────────────────────────────────────────

def search_places(keyword: str, lat: float, lng: float, radius_m: int = 5000) -> list:
    """Gọi Google Places Text Search (New) API."""
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": (
            "places.id,places.displayName,places.formattedAddress,"
            "places.nationalPhoneNumber,places.rating,"
            "places.location,places.regularOpeningHours"
        ),
    }
    body = {
        "textQuery": keyword,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": radius_m,
            }
        },
        "languageCode": "vi",
        "maxResultCount": 20,
    }

    try:
        resp = requests.post(PLACES_API_URL, json=body, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json().get("places", [])
    except requests.exceptions.HTTPError as e:
        logger.error(f"Google API lỗi: {e.response.status_code} — {e.response.text[:200]}")
        return []
    except Exception as e:
        logger.error(f"Request lỗi: {e}")
        return []


# ── Upsert vào DB ──────────────────────────────────────────────────────────────

def upsert_clinic(conn, place: dict) -> bool:
    """
    Lưu phòng khám vào DB.
    Dùng ON DUPLICATE KEY để tránh trùng google_place_id.
    """
    loc = place.get("location", {})
    lat = loc.get("latitude")
    lng = loc.get("longitude")

    if not lat or not lng:
        return False

    place_id   = place.get("id")
    name       = place.get("displayName", {}).get("text", "Phòng khám thú y")
    address    = place.get("formattedAddress", "")
    phone      = place.get("nationalPhoneNumber", "")
    rating     = float(place.get("rating", 0) or 0)
    hours_raw  = place.get("regularOpeningHours", {})
    hours_json = json.dumps(hours_raw, ensure_ascii=False) if hours_raw else "null"

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO clinics
                    (google_place_id, name, address, phone, location,
                     rating, opening_hours, status, source)
                VALUES (
                    %s, %s, %s, %s,
                    ST_GeomFromText(%s, 4326),
                    %s, %s, 'approved', 'google_maps'
                )
                ON DUPLICATE KEY UPDATE
                    name           = VALUES(name),
                    address        = VALUES(address),
                    phone          = VALUES(phone),
                    location       = VALUES(location),
                    rating         = VALUES(rating),
                    opening_hours  = VALUES(opening_hours)
                """,
                (
                    place_id, name, address, phone,
                    f"POINT({lng} {lat})",
                    round(rating, 1),
                    hours_json,
                )
            )
        conn.commit()
        return True
    except Exception as e:
        logger.warning(f"Upsert lỗi [{name}]: {e}")
        conn.rollback()
        return False


# ── Main ──────────────────────────────────────────────────────────────────────

def run():
    if not API_KEY:
        logger.error("❌ Thiếu GOOGLE_PLACES_API_KEY trong .env!")
        return

    conn = get_db()
    ensure_clinics_table(conn)

    total_saved  = 0
    total_found  = 0
    seen_ids     = set()  # Tránh upsert trùng trong cùng một lần chạy

    for lat, lng, city in SEARCH_CLUSTERS:
        for keyword in SEARCH_KEYWORDS:
            logger.info(f"🔍 Quét '{keyword}' tại {city} ({lat}, {lng})...")

            places = search_places(keyword, lat, lng, radius_m=8000)
            total_found += len(places)

            for place in places:
                pid = place.get("id")
                if pid in seen_ids:
                    continue
                seen_ids.add(pid)

                if upsert_clinic(conn, place):
                    total_saved += 1
                    name = place.get("displayName", {}).get("text", "?")
                    logger.info(f"  ✅ {name}")

            # Rate limit: Google cho phép 600 req/min → đợi 0.2s/request
            time.sleep(0.2)

    conn.close()
    logger.info(f"\n{'='*50}")
    logger.info(f"✅ HOÀN TẤT!")
    logger.info(f"   Tìm thấy:  {total_found} phòng khám")
    logger.info(f"   Đã lưu:    {total_saved} phòng khám (unique)")
    logger.info(f"{'='*50}")


if __name__ == "__main__":
    run()
