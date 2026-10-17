import React from 'react';

export default function ConnectionGuide() {
  const steps = [
    {
      num: 1,
      title: 'Mua thiết bị và lấy mã IMEI',
      desc: 'Mua thiết bị và lấy mã IMEI được in sẵn trên thân máy hoặc tem bảo hành phía sau.',
    },
    {
      num: 2,
      title: 'Gắn SIM 4G & cấu hình máy chủ',
      desc: 'Gắn SIM 4G vào thiết bị, nhắn tin SMS để cấu hình thiết bị gửi dữ liệu về IP trang web của bạn.',
    },
    {
      num: 3,
      title: 'Đăng ký vào hệ thống Web',
      desc: 'Đăng nhập vào Web, điền mã IMEI vào biểu mẫu bên cạnh để lưu vào hệ thống.',
    },
    {
      num: 4,
      title: 'Hoàn thành & Kích hoạt AI 24/24',
      desc: 'Hoàn thành! Hệ thống AI sẽ bắt đầu tự động nhận dữ liệu từ IMEI đó, theo dõi và phân tích hướng đi 24/24.',
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 border-l-4 border-l-[#ff4757] hover:shadow-md transition-shadow duration-300">
      {/* Tiêu đề */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">💡</span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
          Hướng Dẫn Kết Nối Thiết Bị Thật
        </h2>
      </div>

      {/* Danh sách 4 bước với vòng tròn màu hồng */}
      <div className="space-y-6">
        {steps.map((step) => (
          <div key={step.num} className="flex items-start gap-4 group">
            {/* Vòng tròn màu hồng chứa số thứ tự trắng */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#ff4757] text-white font-bold text-sm flex items-center justify-center shadow-md shadow-rose-200 group-hover:scale-110 transition-transform duration-200">
              {step.num}
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-[#ff4757] transition-colors">
                {step.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Thông số kỹ thuật phụ */}
      <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Gateway Node.js TCP/UDP Sẵn Sàng
        </span>
        <span className="font-mono">Port: 5000/API</span>
      </div>
    </div>
  );
}
