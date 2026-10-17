import React, { useState, useRef, useEffect } from 'react';

/**
 * ImageCropModal — Modal cắt ảnh với Canvas HTML5
 * - mode='circular': Cắt tròn tỷ lệ 1:1 cho Avatar (512x512)
 * - mode='cover': Cắt chữ nhật tỷ lệ 3:1 cho Ảnh bìa (1600x533)
 */
export default function ImageCropModal({
  file,
  mode = 'circular', // 'circular' | 'cover'
  onSave,
  onClose,
}) {
  const canvasRef = useRef(null);
  const imageRef  = useRef(null);

  const [zoom, setZoom]       = useState(1);
  const [offset, setOffset]   = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart]   = useState({ x: 0, y: 0 });
  const [saving, setSaving]   = useState(false);

  // Target output dimensions
  const isCircular = mode === 'circular';
  const outWidth   = isCircular ? 512 : 1600;
  const outHeight  = isCircular ? 512 : 533;
  const aspect     = outWidth / outHeight;

  // Canvas visual preview size
  const previewWidth  = isCircular ? 320 : 420;
  const previewHeight = Math.round(previewWidth / aspect);

  // Load image file into HTMLImageElement
  useEffect(() => {
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      imageRef.current = img;
      // Auto-fit initial zoom
      const scaleX = previewWidth / img.width;
      const scaleY = previewHeight / img.height;
      const minScale = Math.max(scaleX, scaleY);
      setZoom(minScale);
      setOffset({
        x: (previewWidth - img.width * minScale) / 2,
        y: (previewHeight - img.height * minScale) / 2,
      });
      renderCanvas(img, minScale, {
        x: (previewWidth - img.width * minScale) / 2,
        y: (previewHeight - img.height * minScale) / 2,
      });
    };
    return () => URL.revokeObjectURL(url);
  }, [file, previewWidth, previewHeight]);

  const renderCanvas = (img, currentZoom, currentOffset) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw scaled image
    ctx.save();
    ctx.drawImage(
      img,
      currentOffset.x,
      currentOffset.y,
      img.width * currentZoom,
      img.height * currentZoom
    );
    ctx.restore();

    // Mask overlay
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';

    if (isCircular) {
      // Circular mask cutout
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      const r = Math.min(canvas.width, canvas.height) / 2 - 10;
      ctx.arc(canvas.width / 2, canvas.height / 2, r, 0, Math.PI * 2, true);
      ctx.fill();

      // Border ring
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else {
      // Rectangular 3:1 guideline border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    }
    ctx.restore();
  };

  // Drag pan handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !imageRef.current) return;
    const newOffset = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    };
    setOffset(newOffset);
    renderCanvas(imageRef.current, zoom, newOffset);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (e) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    if (imageRef.current) {
      renderCanvas(imageRef.current, newZoom, offset);
    }
  };

  // Generate cropped Blob and trigger onSave
  const handleConfirm = async () => {
    if (!imageRef.current) return;
    setSaving(true);
    try {
      // High-resolution output canvas
      const outCanvas = document.createElement('canvas');
      outCanvas.width  = outWidth;
      outCanvas.height = outHeight;
      const ctx = outCanvas.getContext('2d');

      // Ratio from preview to target
      const scaleRatio = outWidth / previewWidth;

      ctx.drawImage(
        imageRef.current,
        offset.x * scaleRatio,
        offset.y * scaleRatio,
        imageRef.current.width * zoom * scaleRatio,
        imageRef.current.height * zoom * scaleRatio
      );

      outCanvas.toBlob(
        (blob) => {
          if (blob) {
            onSave(blob);
          }
          setSaving(false);
        },
        'image/webp',
        0.9
      );
    } catch (err) {
      console.error('Crop error:', err);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>{isCircular ? '✂️ Cắt Ảnh Đại Diện' : '🖼️ Cắt Ảnh Bìa (Tỷ Lệ 3:1)'}</span>
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer transition-all"
          >
            ✕
          </button>
        </div>

        {/* Canvas viewport */}
        <div
          className="flex items-center justify-center bg-slate-100 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={previewWidth}
            height={previewHeight}
            className="block"
          />
          <div className="absolute bottom-2 left-2 text-[10px] bg-slate-900/60 text-white px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none">
            🖐️ Kéo để di chuyển
          </div>
        </div>

        {/* Zoom Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-600">
            <span>Thu nhỏ</span>
            <span>🔍 Phóng to</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.02}
            value={zoom}
            onChange={handleZoomChange}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#ff4757]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-2.5 rounded-2xl bg-[#ff4757] hover:bg-[#ff6b81] disabled:opacity-60 text-white font-black text-xs shadow-md shadow-rose-200 cursor-pointer transition-all flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>✅ Lưu Ảnh</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
