"""
main.py — FastAPI RAG Microservice (port 8002)
===============================================
2 endpoint chính:
  POST /embed-post      — Sinh embedding khi bài forum được duyệt
  POST /search-context  — Tìm chunks liên quan khi có SOS
  GET  /health          — Kiểm tra service sống
"""

import os
import logging
from typing import List, Optional

import google.generativeai as genai
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from embedder import chunk_text, embed_texts, embed_single, rank_chunks
from database import (
    ensure_tables_exist,
    save_chunks,
    load_all_chunks,
    count_chunks,
)

load_dotenv()
logging.basicConfig(level=os.getenv("LOG_LEVEL", "info").upper())
logger = logging.getLogger(__name__)

# ── Khởi tạo ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="PetEmergency RAG Service",
    description="Sinh Embeddings forum + Truy vấn ngữ cảnh cho AI Sơ cứu",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8001", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cấu hình Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
gemini_model = genai.GenerativeModel("gemini-1.5-flash")

CHUNK_SIZE    = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))
TOP_K         = int(os.getenv("TOP_K", 3))
THRESHOLD     = float(os.getenv("SIMILARITY_THRESHOLD", 0.3))


# ── Schemas ───────────────────────────────────────────────────────────────────

class EmbedPostRequest(BaseModel):
    post_id: int = Field(..., description="ID bài viết trong bảng posts")
    content: str = Field(..., min_length=10, description="Nội dung bài viết")
    title:   Optional[str] = Field(None, description="Tiêu đề bài viết (tuỳ chọn)")

class EmbedPostResponse(BaseModel):
    post_id:    int
    chunks_saved: int
    message:    str


class SearchContextRequest(BaseModel):
    query:       str  = Field(..., description="Tags triệu chứng, VD: 'Chảy máu tai nạn'")
    top_k:       int  = Field(3, ge=1, le=10)
    threshold:   float = Field(0.3, ge=0.0, le=1.0)

class ContextChunk(BaseModel):
    text:  str
    score: float

class SearchContextResponse(BaseModel):
    query:   str
    chunks:  List[ContextChunk]
    total_db_chunks: int


class AiFirstAidRequest(BaseModel):
    symptom_tags: List[str] = Field(..., description="Tags triệu chứng")
    notes:        Optional[str] = None
    # pet_photo_base64: Optional[str] = None  # Tương lai: gửi ảnh

class AiFirstAidResponse(BaseModel):
    steps:       List[str]
    context_used: int   # Số chunks từ forum được dùng
    warning:     str


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup():
    """Tạo bảng DB và load model khi service khởi động."""
    logger.info("Đang khởi động RAG Service...")
    try:
        ensure_tables_exist()
        logger.info("DB tables OK.")
    except Exception as e:
        logger.warning(f"DB setup warning: {e}")


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Kiểm tra service đang sống."""
    return {
        "status": "ok",
        "service": "PetEmergency RAG Service",
        "db_chunks": _safe_count(),
    }


@app.post("/embed-post", response_model=EmbedPostResponse)
async def embed_post(req: EmbedPostRequest, background_tasks: BackgroundTasks):
    """
    **Hàm 1: Sinh Embedding khi bài viết forum được duyệt.**

    Luồng:
    1. Nhận nội dung bài viết từ Laravel (sau khi admin duyệt).
    2. Ghép title + content nếu có.
    3. Chunking → Embedding → Lưu vào MySQL.
    4. Trả về ngay (không block), embedding chạy background nếu bài dài.

    ---
    Được gọi bởi: `App\\Jobs\\GeneratePostEmbedding` (Laravel Queue).
    """
    try:
        # Ghép tiêu đề vào content để tăng ngữ nghĩa
        full_text = f"{req.title}\n\n{req.content}" if req.title else req.content

        # Bước 1: Chunking
        chunks = chunk_text(full_text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP)
        if not chunks:
            raise HTTPException(status_code=400, detail="Nội dung quá ngắn để chunk.")

        # Bước 2: Embedding batch (nhanh hơn gọi từng cái)
        embeddings = embed_texts(chunks)

        # Bước 3: Lưu vào MySQL
        saved = save_chunks(
            post_id=req.post_id,
            chunks=chunks,
            embeddings=embeddings,
        )

        logger.info(f"✅ Embed post_id={req.post_id}: {saved} chunks")
        return EmbedPostResponse(
            post_id=req.post_id,
            chunks_saved=saved,
            message=f"Đã sinh {saved} embeddings cho bài viết #{req.post_id}",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Lỗi embed post_id={req.post_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi sinh embedding: {str(e)}")


@app.post("/search-context", response_model=SearchContextResponse)
async def search_context(req: SearchContextRequest):
    """
    **Hàm 2: Tìm chunks liên quan nhất từ forum khi có ca SOS.**

    Luồng:
    1. Nhận query (tags triệu chứng ghép chuỗi).
    2. Embed query thành vector.
    3. Tải tất cả chunks từ DB, tính cosine similarity.
    4. Trả về top_k chunks có score cao nhất.

    ---
    Được gọi bởi: `EmergencyController::askAiFirstAid()` (Laravel).
    """
    try:
        # Bước 1: Embed câu truy vấn
        query_vector = embed_single(req.query)

        # Bước 2: Tải chunks từ DB
        all_chunks = load_all_chunks()
        total = len(all_chunks)

        if total == 0:
            logger.warning("DB chưa có embeddings nào.")
            return SearchContextResponse(query=req.query, chunks=[], total_db_chunks=0)

        # Bước 3: Xếp hạng theo cosine similarity
        top_chunks = rank_chunks(
            query_vector=query_vector,
            chunks=all_chunks,
            top_k=req.top_k,
            threshold=req.threshold,
        )

        logger.info(
            f"Query='{req.query}' → {len(top_chunks)}/{total} chunks khớp "
            f"(threshold={req.threshold})"
        )

        return SearchContextResponse(
            query=req.query,
            chunks=[ContextChunk(text=t, score=round(s, 4)) for t, s in top_chunks],
            total_db_chunks=total,
        )

    except Exception as e:
        logger.exception(f"Lỗi search context: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi tìm kiếm context: {str(e)}")


@app.post("/ai-first-aid", response_model=AiFirstAidResponse)
async def ai_first_aid(req: AiFirstAidRequest):
    """
    **Full RAG pipeline: Lấy context forum → Gọi Gemini → Trả hướng dẫn sơ cứu.**

    Endpoint này kết hợp search_context + Gemini trong một lần gọi.
    Laravel có thể gọi thẳng endpoint này thay vì gọi 2 bước riêng.
    """
    try:
        query_text = " ".join(req.symptom_tags)
        if req.notes:
            query_text += f" {req.notes}"

        # ── Bước 1: Lấy context từ forum ─────────────────────────────────────
        query_vector = embed_single(query_text)
        all_chunks   = load_all_chunks()
        top_chunks   = rank_chunks(query_vector, all_chunks, top_k=TOP_K, threshold=THRESHOLD)

        context_text = ""
        if top_chunks:
            context_parts = [f"[Nguồn {i+1}]: {text}" for i, (text, _) in enumerate(top_chunks)]
            context_text = "\n\n".join(context_parts)

        # ── Bước 2: Xây dựng Prompt RAG ───────────────────────────────────────
        system_context = (
            f"Bạn là bác sĩ thú y khẩn cấp. Dưới đây là các hướng dẫn từ diễn đàn chuyên môn:\n\n"
            f"{context_text}\n\n"
            if context_text
            else "Bạn là bác sĩ thú y khẩn cấp với kiến thức y khoa chuyên sâu.\n\n"
        )

        prompt = (
            f"{system_context}"
            f"Thú cưng đang có triệu chứng: {', '.join(req.symptom_tags)}.\n"
            f"{'Ghi chú thêm: ' + req.notes if req.notes else ''}\n\n"
            f"Hãy đưa ra CHÍNH XÁC 3-4 bước sơ cứu khẩn cấp:\n"
            f"- Mỗi bước tối đa 15 từ, ngắn gọn và dễ thực hiện ngay.\n"
            f"- Chỉ trả về danh sách gạch đầu dòng, không giải thích dài dòng.\n"
            f"- Bắt đầu bằng hành động ngay lập tức, KHÔNG bắt đầu bằng 'Bước 1:'.\n"
            f"- Dùng tiếng Việt."
        )

        # ── Bước 3: Gọi Gemini ────────────────────────────────────────────────
        response = gemini_model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                max_output_tokens=300,
                temperature=0.3,  # Thấp = ít sáng tạo, đáng tin cậy hơn
            ),
        )

        raw_text = response.text.strip()

        # Parse thành list các bước
        steps = [
            line.lstrip("•-*●▶ ").strip()
            for line in raw_text.split("\n")
            if line.strip() and len(line.strip()) > 5
        ][:4]  # Giới hạn 4 bước

        return AiFirstAidResponse(
            steps=steps,
            context_used=len(top_chunks),
            warning=(
                "⚠️ Đây là hướng dẫn sơ cứu tạm thời. "
                "Vui lòng đưa thú cưng đến bác sĩ thú y ngay khi có thể!"
            ),
        )

    except Exception as e:
        logger.exception(f"Lỗi AI first aid: {e}")
        # Fallback khi Gemini lỗi
        return AiFirstAidResponse(
            steps=[
                "Giữ thú cưng nằm yên, tránh kích động.",
                "Cầm máu bằng vải sạch nếu đang chảy máu.",
                "Giữ ấm, đừng cho ăn uống gì thêm.",
                "Gọi bác sĩ ngay hoặc đưa đến phòng khám gần nhất.",
            ],
            context_used=0,
            warning="⚠️ Đang dùng hướng dẫn mặc định do lỗi AI. Hãy liên hệ bác sĩ ngay!",
        )


# ── Helper ───────────────────────────────────────────────────────────────────

def _safe_count() -> int:
    try:
        return count_chunks()
    except Exception:
        return -1


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8002)),
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info"),
    )
