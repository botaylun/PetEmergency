"""
database.py — Kết nối MySQL và các hàm CRUD cho RAG
=====================================================
Dùng pymysql (pure Python, không cần MySQL Connector).
"""

import os
import json
import logging
from contextlib import contextmanager
from typing import Generator, List, Tuple, Optional

import pymysql
import pymysql.cursors
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


# ── Connection factory ────────────────────────────────────────────────────────

def get_connection() -> pymysql.Connection:
    """Tạo kết nối MySQL mới. Dùng trong context manager."""
    return pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "pet_emergency"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


@contextmanager
def db_cursor() -> Generator:
    """
    Context manager tự động đóng kết nối và rollback khi lỗi.

    Usage:
        with db_cursor() as cursor:
            cursor.execute("SELECT 1")
    """
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"DB error: {e}")
        raise
    finally:
        conn.close()


# ── DDL: Tạo bảng nếu chưa có ───────────────────────────────────────────────

CREATE_EMBEDDINGS_TABLE = """
CREATE TABLE IF NOT EXISTS post_embeddings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT UNSIGNED NOT NULL,
    chunk_index INT NOT NULL DEFAULT 0,
    chunk_text TEXT NOT NULL,
    embedding JSON NOT NULL,
    embedding_model VARCHAR(100) DEFAULT 'all-MiniLM-L6-v2',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_id (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

CREATE_SPATIAL_TABLES = """
CREATE TABLE IF NOT EXISTS doctors_online (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    location POINT NOT NULL SRID 4326,
    is_online TINYINT(1) DEFAULT 0,
    is_busy TINYINT(1) DEFAULT 0,
    socket_id VARCHAR(100) NULL,
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user (user_id),
    SPATIAL INDEX idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

CREATE_CLINICS_TABLE = """
CREATE TABLE IF NOT EXISTS clinics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    google_place_id VARCHAR(255) NULL,
    name VARCHAR(500) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    location POINT NOT NULL SRID 4326,
    rating DECIMAL(2,1) DEFAULT 0,
    opening_hours JSON,
    status ENUM('approved','pending') DEFAULT 'pending',
    source ENUM('google_maps','user_contributed') DEFAULT 'user_contributed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_place_id (google_place_id),
    SPATIAL INDEX idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

CREATE_EMERGENCY_REQUESTS_TABLE = """
CREATE TABLE IF NOT EXISTS emergency_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    location POINT NOT NULL SRID 4326,
    symptom_tags JSON,
    notes TEXT NULL,
    pet_photo_url VARCHAR(500) NULL,
    ai_first_aid TEXT NULL,
    doctor_id BIGINT UNSIGNED NULL,
    status ENUM('finding','accepted','completed','cancelled') DEFAULT 'finding',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    SPATIAL INDEX idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""


def ensure_tables_exist() -> None:
    """Tạo các bảng RAG nếu chưa tồn tại. Gọi khi service khởi động."""
    with db_cursor() as cursor:
        for ddl in [
            CREATE_EMBEDDINGS_TABLE,
            CREATE_SPATIAL_TABLES,
            CREATE_CLINICS_TABLE,
            CREATE_EMERGENCY_REQUESTS_TABLE,
        ]:
            try:
                cursor.execute(ddl)
            except pymysql.err.OperationalError as e:
                # Bỏ qua lỗi SPATIAL không hỗ trợ trên MySQL < 8.0
                logger.warning(f"DDL warning (có thể bỏ qua): {e}")


# ── CRUD cho post_embeddings ─────────────────────────────────────────────────

def save_chunks(
    post_id: int,
    chunks: List[str],
    embeddings: List[List[float]],
    model_name: str = "all-MiniLM-L6-v2",
) -> int:
    """
    Lưu các chunk + embedding của một bài viết vào MySQL.
    Xóa embedding cũ của post_id trước khi chèn mới (idempotent).

    Args:
        post_id:    ID bài viết trong bảng `posts`.
        chunks:     Danh sách đoạn văn bản đã cắt.
        embeddings: Vector tương ứng với từng chunk.
        model_name: Tên model đã dùng để embed.

    Returns:
        Số lượng chunk đã lưu thành công.
    """
    with db_cursor() as cursor:
        # Xóa embedding cũ (cho phép re-index khi nội dung thay đổi)
        cursor.execute(
            "DELETE FROM post_embeddings WHERE post_id = %s", (post_id,)
        )

        rows = [
            (post_id, idx, chunk, json.dumps(vec), model_name)
            for idx, (chunk, vec) in enumerate(zip(chunks, embeddings))
        ]

        cursor.executemany(
            """
            INSERT INTO post_embeddings
                (post_id, chunk_index, chunk_text, embedding, embedding_model)
            VALUES (%s, %s, %s, %s, %s)
            """,
            rows,
        )

    logger.info(f"Đã lưu {len(rows)} chunks cho post_id={post_id}")
    return len(rows)


def load_all_chunks() -> List[Tuple[int, str, List[float]]]:
    """
    Tải toàn bộ chunks từ DB để thực hiện vector similarity search.
    (Với DB nhỏ < 50k chunks, in-memory search đủ nhanh.)

    Returns:
        Danh sách tuple (id, chunk_text, embedding_vector).
    """
    with db_cursor() as cursor:
        cursor.execute(
            "SELECT id, chunk_text, embedding FROM post_embeddings"
        )
        rows = cursor.fetchall()

    result = []
    for row in rows:
        try:
            vector = json.loads(row["embedding"])
            result.append((row["id"], row["chunk_text"], vector))
        except (json.JSONDecodeError, KeyError):
            logger.warning(f"Embedding lỗi tại id={row.get('id')}")

    return result


def load_chunks_by_post(post_id: int) -> List[Tuple[int, str, List[float]]]:
    """Tải chunks của một post cụ thể."""
    with db_cursor() as cursor:
        cursor.execute(
            "SELECT id, chunk_text, embedding FROM post_embeddings WHERE post_id = %s",
            (post_id,),
        )
        rows = cursor.fetchall()

    return [
        (r["id"], r["chunk_text"], json.loads(r["embedding"]))
        for r in rows
    ]


def count_chunks() -> int:
    """Đếm tổng số chunks trong DB."""
    with db_cursor() as cursor:
        cursor.execute("SELECT COUNT(*) AS cnt FROM post_embeddings")
        return cursor.fetchone()["cnt"]


# ── CRUD cho doctors_online ───────────────────────────────────────────────────

def upsert_doctor_location(
    user_id: int,
    lng: float,
    lat: float,
    socket_id: Optional[str] = None,
) -> None:
    """
    Cập nhật hoặc tạo mới vị trí bác sĩ.
    POINT(lng, lat) — quy ước MySQL WGS84.
    """
    with db_cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO doctors_online (user_id, location, is_online, socket_id)
            VALUES (%s, ST_GeomFromText('POINT(%s %s)', 4326), 1, %s)
            ON DUPLICATE KEY UPDATE
                location = ST_GeomFromText('POINT(%s %s)', 4326),
                is_online = 1,
                socket_id = %s,
                last_heartbeat = NOW()
            """,
            (user_id, lng, lat, socket_id, lng, lat, socket_id),
        )


def find_nearby_doctors(
    user_lng: float,
    user_lat: float,
    radius_meters: float = 5000,
) -> List[dict]:
    """
    Tìm bác sĩ online, không bận trong bán kính radius_meters.
    Dùng ST_Distance_Sphere — nhanh, chính xác, built-in MySQL 8.

    Args:
        user_lng, user_lat: Tọa độ người dùng.
        radius_meters:      Bán kính tìm kiếm (mặc định 5km).

    Returns:
        Danh sách dict chứa user_id, socket_id, distance_m.
    """
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                d.user_id,
                d.socket_id,
                u.name,
                u.phone,
                ROUND(
                    ST_Distance_Sphere(
                        d.location,
                        ST_GeomFromText('POINT(%s %s)', 4326)
                    )
                ) AS distance_m
            FROM doctors_online d
            JOIN users u ON u.id = d.user_id
            WHERE
                d.is_online = 1
                AND d.is_busy = 0
                AND ST_Distance_Sphere(
                    d.location,
                    ST_GeomFromText('POINT(%s %s)', 4326)
                ) <= %s
            ORDER BY distance_m ASC
            """,
            (user_lng, user_lat, user_lng, user_lat, radius_meters),
        )
        return cursor.fetchall()


# ── CRUD cho clinics ──────────────────────────────────────────────────────────

def upsert_clinic_from_google(clinic_data: dict) -> None:
    """
    Lưu phòng khám từ Google Places API.
    Dùng ON DUPLICATE KEY để tránh trùng google_place_id.

    Args:
        clinic_data: Dict từ Google Places response.
            Cần có: google_place_id, name, address, phone,
                    lat, lng, rating, opening_hours.
    """
    with db_cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO clinics
                (google_place_id, name, address, phone, location,
                 rating, opening_hours, status, source)
            VALUES (
                %s, %s, %s, %s,
                ST_GeomFromText('POINT(%s %s)', 4326),
                %s, %s, 'approved', 'google_maps'
            )
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                address = VALUES(address),
                phone = VALUES(phone),
                location = VALUES(location),
                rating = VALUES(rating),
                opening_hours = VALUES(opening_hours)
            """,
            (
                clinic_data.get("google_place_id"),
                clinic_data.get("name"),
                clinic_data.get("address"),
                clinic_data.get("phone"),
                clinic_data.get("lng", 0),
                clinic_data.get("lat", 0),
                clinic_data.get("rating", 0),
                json.dumps(clinic_data.get("opening_hours", {})),
            ),
        )


def find_nearby_clinics(
    user_lng: float, user_lat: float, radius_meters: float = 10000
) -> List[dict]:
    """Tìm phòng khám đã duyệt gần người dùng."""
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                id, name, address, phone, rating,
                ROUND(
                    ST_Distance_Sphere(
                        location,
                        ST_GeomFromText('POINT(%s %s)', 4326)
                    )
                ) AS distance_m,
                ST_X(location) AS lng,
                ST_Y(location) AS lat
            FROM clinics
            WHERE
                status = 'approved'
                AND ST_Distance_Sphere(
                    location,
                    ST_GeomFromText('POINT(%s %s)', 4326)
                ) <= %s
            ORDER BY distance_m ASC
            LIMIT 20
            """,
            (user_lng, user_lat, user_lng, user_lat, radius_meters),
        )
        return cursor.fetchall()
