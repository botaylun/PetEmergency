import React from 'react';

/**
 * ErrorBoundary — Bắt lỗi render React và hiển thị fallback tiếng Việt thân thiện
 * Hỗ trợ 2 chế độ:
 * - type="app": Fallback toàn trang khi ứng dụng gặp sự cố nghiêm trọng
 * - type="map": Fallback dạng hộp bản đồ, vẫn hiển thị thông tin ca cứu nạn và link dẫn đường ngoài
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { type = 'app', fallbackCase = null } = this.props;

    // Fallback cho bản đồ (Map Error Fallback)
    if (type === 'map') {
      const caseItem = fallbackCase || this.props.sos || null;
      const lat = parseFloat(caseItem?.sos_latitude || caseItem?.latitude || 21.0285);
      const lng = parseFloat(caseItem?.sos_longitude || caseItem?.longitude || 105.8542);
      const distKm = caseItem?.distance_km != null ? caseItem.distance_km : null;

      return (
        <div className="w-full rounded-3xl border-2 border-amber-200 bg-amber-50/80 p-6 text-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-3.5 mb-4">
            <span className="text-3xl">🗺️</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-extrabold text-amber-900">
                Bản đồ tạm thời không thể hiển thị trực quan
              </h4>
              <p className="text-xs text-amber-800 mt-1">
                Hệ thống vẫn giữ trọn vẹn thông tin ca cấp cứu và cung cấp dẫn đường ngoại vi bên dưới.
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              🔄 Thử lại
            </button>
          </div>

          {/* Thông tin ca cấp cứu bảo toàn */}
          {caseItem && (
            <div className="bg-white/90 rounded-2xl p-4 border border-amber-200 mb-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Mã ca:</span>
                <span className="font-extrabold text-red-600">#{caseItem.id || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Chủ nuôi:</span>
                <span className="font-bold text-slate-800">{caseItem.user?.name || caseItem.patient?.name || 'Ẩn danh'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Thú cưng:</span>
                <span className="font-bold text-slate-800">
                  {caseItem.pet?.name || caseItem.pet_name || 'Bé cưng'} ({caseItem.pet?.breed || caseItem.pet_breed || 'Thú cưng'})
                </span>
              </div>
              {distKm != null && (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Khoảng cách chim bay:</span>
                  <span className="font-extrabold text-blue-700">📍 ~{distKm} km</span>
                </div>
              )}
              {caseItem.description && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-500 block mb-0.5">Mô tả:</span>
                  <p className="text-slate-700 italic">"{caseItem.description}"</p>
                </div>
              )}
            </div>
          )}

          {/* Nút điều hướng ngoại vi */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              📍 Mở Google Maps
            </a>
            <a
              href={`https://maps.apple.com/?daddr=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              🍏 Apple Maps
            </a>
            <a
              href={`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              🚙 Waze
            </a>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                alert(`Đã sao chép tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
              }}
              className="px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs flex items-center gap-1 transition-all"
            >
              📋 Sao chép tọa độ
            </button>
          </div>
        </div>
      );
    }

    // Fallback toàn ứng dụng (Global App Fallback)
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-800">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-100 text-[#ff4757] flex items-center justify-center text-3xl font-black">
            🚨
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            Đã Xảy Ra Sự Cố Không Mong Muốn
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Ứng dụng đã ghi nhận lỗi và bảo vệ phiên làm việc của bạn. Bạn có thể nhấn nút thử lại hoặc quay về trang chủ.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex-1 py-3 rounded-2xl bg-[#ff4757] hover:bg-[#ff6b81] text-white font-black text-xs shadow-md shadow-rose-200 transition-all cursor-pointer"
            >
              🔄 Thử Lại Ngay
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
            >
              🏠 Về Trang Chủ
            </button>
          </div>
        </div>
      </div>
    );
  }
}
