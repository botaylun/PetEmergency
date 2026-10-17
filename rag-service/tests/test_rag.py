"""
tests/test_rag.py — Unit tests cho RAG Service
================================================
Chạy: python -m pytest rag-service/tests/ -v
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from embedder import chunk_text, embed_single, cosine_similarity, rank_chunks


# ── Test chunk_text ───────────────────────────────────────────────────────────

class TestChunkText:
    def test_short_text_returns_single_chunk(self):
        text = "Bài viết ngắn về sơ cứu chó mèo."
        chunks = chunk_text(text, chunk_size=500)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_long_text_creates_multiple_chunks(self):
        # Tạo text dài hơn 500 ký tự
        text = "Đây là một đoạn văn mẫu về sơ cứu thú cưng. " * 20
        chunks = chunk_text(text, chunk_size=100, overlap=10)
        assert len(chunks) > 1

    def test_chunks_not_too_short(self):
        text = "Hướng dẫn sơ cứu " * 30
        chunks = chunk_text(text, chunk_size=100, overlap=10)
        for chunk in chunks:
            assert len(chunk) > 20, f"Chunk quá ngắn: '{chunk}'"

    def test_empty_text(self):
        chunks = chunk_text("", chunk_size=500)
        # Văn bản rỗng → không có chunk nào hợp lệ
        assert chunks == []

    def test_overlap_creates_context_continuity(self):
        """Đảm bảo overlap không bị âm hoặc quá lớn."""
        text = "Abc " * 200
        chunks = chunk_text(text, chunk_size=100, overlap=20)
        assert len(chunks) >= 2


# ── Test embed_single ─────────────────────────────────────────────────────────

class TestEmbedSingle:
    def test_returns_float_list(self):
        vec = embed_single("Chó bị chảy máu")
        assert isinstance(vec, list)
        assert all(isinstance(v, float) for v in vec)

    def test_vector_dimension(self):
        """Model all-MiniLM-L6-v2 cho 384 dims."""
        vec = embed_single("Mèo bị ngộ độc")
        assert len(vec) == 384

    def test_different_texts_different_vectors(self):
        v1 = embed_single("Chó bị chảy máu nặng")
        v2 = embed_single("Mèo đang ăn uống bình thường")
        # Cosine similarity phải < 1 (không giống hệt)
        sim = cosine_similarity(v1, v2)
        assert sim < 0.99

    def test_similar_texts_high_similarity(self):
        v1 = embed_single("chảy máu vết thương chó")
        v2 = embed_single("chó bị thương chảy máu")
        sim = cosine_similarity(v1, v2)
        assert sim > 0.7, f"Similarity quá thấp: {sim}"


# ── Test cosine_similarity ────────────────────────────────────────────────────

class TestCosineSimilarity:
    def test_identical_vectors(self):
        v = embed_single("test")
        assert abs(cosine_similarity(v, v) - 1.0) < 1e-5

    def test_range_between_minus1_and_1(self):
        v1 = embed_single("sơ cứu thú cưng")
        v2 = embed_single("nấu ăn ngon")
        sim = cosine_similarity(v1, v2)
        assert -1.0 <= sim <= 1.0


# ── Test rank_chunks ──────────────────────────────────────────────────────────

class TestRankChunks:
    def setup_method(self):
        """Chuẩn bị dữ liệu test."""
        self.texts = [
            "Khi chó bị chảy máu, cần dùng vải sạch cầm máu ngay.",
            "Mèo bị ngộ độc cần đến bác sĩ thú y ngay lập tức.",
            "Thức ăn tốt cho chó con là sữa và thức ăn mềm.",
        ]
        from embedder import embed_texts
        vecs = embed_texts(self.texts)
        self.chunks = [(i, text, vec) for i, (text, vec) in enumerate(zip(self.texts, vecs))]

    def test_top1_most_relevant(self):
        query_vec = embed_single("Chó đang chảy máu cần cầm máu")
        results = rank_chunks(query_vec, self.chunks, top_k=1, threshold=0.0)
        assert len(results) == 1
        # Kết quả đầu tiên phải liên quan đến chảy máu
        assert "chảy máu" in results[0][0].lower()

    def test_threshold_filters_low_scores(self):
        query_vec = embed_single("Chó đang chảy máu")
        results = rank_chunks(query_vec, self.chunks, top_k=3, threshold=0.9)
        # Với threshold cao, ít kết quả hơn
        assert len(results) <= 3

    def test_top_k_limits_results(self):
        query_vec = embed_single("thú cưng")
        results = rank_chunks(query_vec, self.chunks, top_k=2, threshold=0.0)
        assert len(results) <= 2

    def test_results_sorted_by_score_descending(self):
        query_vec = embed_single("Mèo bị ngộ độc")
        results = rank_chunks(query_vec, self.chunks, top_k=3, threshold=0.0)
        scores = [r[1] for r in results]
        assert scores == sorted(scores, reverse=True)


# ── Integration test ──────────────────────────────────────────────────────────

class TestEndToEndRAG:
    """
    Test toàn bộ luồng RAG:
    chunk → embed → search.
    KHÔNG cần DB thật (in-memory).
    """

    def test_full_rag_pipeline(self):
        from embedder import chunk_text, embed_texts, embed_single, rank_chunks

        # Giả lập 1 bài viết forum
        article = """
        Hướng dẫn sơ cứu khi chó bị chảy máu:
        1. Giữ chó nằm yên, không để chó tự liếm vết thương.
        2. Dùng vải sạch (hoặc gạc y tế) ép chặt lên vết thương.
        3. Giữ áp lực trong 5-10 phút không nhấc tay lên.
        4. Nếu máu không cầm được sau 10 phút, đưa chó đến bác sĩ ngay.
        """

        # Step 1: Chunking
        chunks = chunk_text(article.strip(), chunk_size=200, overlap=20)
        assert len(chunks) >= 1

        # Step 2: Embedding
        embeddings = embed_texts(chunks)
        assert len(embeddings) == len(chunks)

        # Step 3: Search
        query_vec = embed_single("Chó chảy máu cần làm gì")
        db_chunks = [(i, c, e) for i, (c, e) in enumerate(zip(chunks, embeddings))]
        results = rank_chunks(query_vec, db_chunks, top_k=2, threshold=0.3)

        assert len(results) > 0
        assert results[0][1] > 0.3  # Score đủ cao
        print(f"\n✅ RAG pipeline OK — Top result ({results[0][1]:.3f}):\n{results[0][0][:100]}...")
