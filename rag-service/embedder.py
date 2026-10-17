"""
embedder.py — Module sinh và quản lý Embeddings
================================================
Dùng sentence-transformers (miễn phí, chạy offline).
Model mặc định: all-MiniLM-L6-v2 (384 dims, nhẹ, tốt tiếng Việt).
"""

import os
import json
import logging
from typing import List, Tuple

import numpy as np
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ── Khởi tạo model một lần duy nhất (singleton) ─────────────────────────────
_model: SentenceTransformer | None = None

def get_model() -> SentenceTransformer:
    """Lazy-load model để tránh tải lại mỗi request."""
    global _model
    if _model is None:
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        logger.info(f"Đang tải embedding model: {model_name}")
        _model = SentenceTransformer(model_name)
        logger.info("Model đã sẵn sàng.")
    return _model


# ── Chunking ─────────────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Cắt nhỏ văn bản thành các đoạn chunk_size ký tự, có overlap.
    Ưu tiên cắt tại ranh giới câu (dấu '.' '!' '?') để giữ ngữ nghĩa.

    Args:
        text:       Văn bản gốc (nội dung bài viết forum).
        chunk_size: Kích thước mỗi chunk (ký tự). Mặc định 500.
        overlap:    Số ký tự overlap giữa các chunk. Mặc định 50.

    Returns:
        Danh sách các chuỗi chunk.
    """
    text = text.strip()
    if len(text) <= chunk_size:
        return [text]

    chunks: List[str] = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        if end >= len(text):
            # Chunk cuối cùng
            chunks.append(text[start:].strip())
            break

        # Tìm vị trí cắt tốt nhất (tại ranh giới câu)
        cut = end
        for punct in ['. ', '! ', '? ', '\n\n', '\n']:
            pos = text.rfind(punct, start, end)
            if pos != -1 and pos > start + chunk_size // 2:
                cut = pos + len(punct)
                break

        chunks.append(text[start:cut].strip())
        start = cut - overlap  # Giữ overlap để không mất ngữ cảnh

    return [c for c in chunks if len(c) > 20]  # Bỏ chunk quá ngắn


# ── Embedding ────────────────────────────────────────────────────────────────

def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Sinh embedding vectors cho danh sách văn bản.

    Args:
        texts: Danh sách chuỗi cần embed.

    Returns:
        Danh sách vector float (numpy array → Python list để JSON serialize).
    """
    model = get_model()
    # normalize_embeddings=True: quan trọng để cosine similarity = dot product
    vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return [v.tolist() for v in vectors]


def embed_single(text: str) -> List[float]:
    """Embed một chuỗi duy nhất. Tiện dụng khi query."""
    return embed_texts([text])[0]


# ── Similarity ───────────────────────────────────────────────────────────────

def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Tính cosine similarity giữa 2 vector.
    Vì đã normalize khi embed, cosine = dot product.
    """
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    return float(np.dot(a, b))


def rank_chunks(
    query_vector: List[float],
    chunks: List[Tuple[int, str, List[float]]],  # (id, text, vector)
    top_k: int = 3,
    threshold: float = 0.3,
) -> List[Tuple[str, float]]:
    """
    Xếp hạng các chunks theo độ tương đồng với query_vector.

    Args:
        query_vector: Vector của câu truy vấn (tag triệu chứng).
        chunks:       Danh sách (id, chunk_text, embedding_vector).
        top_k:        Số kết quả trả về.
        threshold:    Ngưỡng similarity tối thiểu (loại bỏ kết quả quá xa).

    Returns:
        Danh sách (chunk_text, similarity_score) đã sắp xếp giảm dần.
    """
    scored: List[Tuple[str, float]] = []

    for _, text, vector in chunks:
        score = cosine_similarity(query_vector, vector)
        if score >= threshold:
            scored.append((text, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_k]
