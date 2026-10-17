import React, { useState } from 'react';
import axios from 'axios';
import { DEFAULT_MALE_AVATAR, DEFAULT_FEMALE_AVATAR } from '../constants/avatars';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, message }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('user'); // 'user' | 'doctor'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('male');
  const [clinicName, setClinicName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setName(''); setEmail(''); setPassword('');
    setGender('male'); setClinicName(''); setSpecialty('');
    setError(''); setLoading(false);
  };

  const switchMode = (m) => { setMode(m); resetForm(); };

  const buildUserObj = (data) => {
    const defaultAvatar = data.role === 'doctor'
      ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&h=120&fit=crop'
      : ((data.gender === 'female' || gender === 'female')
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop');

    return {
      id:          data.id,
      name:        data.name,
      email:       data.email,
      role:        data.role || 'user',
      gender:      data.gender || gender,
      avatar:      data.avatar_url || defaultAvatar,
      clinicName:  data.clinic_name || clinicName,
      specialty:   data.specialty   || specialty,
      verification_status: data.verification_status || 'verified',
    };
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      // 1) Get CSRF cookie
      await axios.get('/sanctum/csrf-cookie');
      // 2) Login
      const res = await axios.post('/api/v1/auth/login', { email, password });
      if (res.data.success) {
        onLoginSuccess(buildUserObj(res.data.data));
        onClose();
      } else {
        setError(res.data.message || 'Đăng nhập thất bại.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Email hoặc mật khẩu không đúng.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Vui lòng nhập họ tên.'); return; }
    setLoading(true); setError('');
    try {
      await axios.get('/sanctum/csrf-cookie');
      const payload = { name, email, password, role };
      if (role === 'doctor') {
        payload.clinic_name = clinicName;
        payload.specialty   = specialty;
      }
      const res = await axios.post('/api/v1/auth/register', payload);
      if (res.data.success) {
        onLoginSuccess(buildUserObj(res.data.data));
        onClose();
      } else {
        setError(res.data.message || 'Đăng ký thất bại.');
      }
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        const first = Object.values(errors)[0];
        setError(Array.isArray(first) ? first[0] : first);
      } else {
        setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick demo login (seamlessly logs in and syncs session)
  const handleQuickDemo = async (demoType) => {
    let userObj;
    let email = 'minhanh@example.com';

    if (demoType === 'admin') {
      email = 'admin@petemergency.com';
      userObj = {
        id: 10,
        name: 'Admin PetEmergency',
        email: email,
        role: 'admin',
        gender: 'male',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
        verification_status: 'verified',
      };
    } else if (demoType === 'doctor') {
      email = 'dr.mai@example.com';
      userObj = {
        id: 4,
        name: 'BS. Phạm Thị Mai',
        email: email,
        role: 'doctor',
        gender: 'female',
        specialty: 'Chuyên khoa Cấp cứu & Hồi sức',
        clinicName: 'Bệnh viện Thú y Quốc tế 24/7',
        avatar: 'https://images.unsplash.com/photo-1594824813689-f53d5a4c5192?w=120&h=120&fit=crop',
        verification_status: 'verified',
      };
    } else if (demoType === 'female') {
      email = 'thuha@example.com';
      userObj = {
        id: 3,
        name: 'Lê Thu Hà',
        email: email,
        role: 'user',
        gender: 'female',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
        verification_status: 'verified',
      };
    } else {
      email = 'minhanh@example.com';
      userObj = {
        id: 1,
        name: 'Nguyễn Minh Anh',
        email: email,
        role: 'user',
        gender: 'male',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop',
        verification_status: 'verified',
      };
    }

    // Tạo session thật trên backend nếu có thể
    try {
      await axios.get('/sanctum/csrf-cookie');
      await axios.post('/api/v1/auth/login', { email, password: demoType === 'admin' ? 'admin123' : 'password' });
    } catch (_) {}

    onLoginSuccess(userObj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative overflow-y-auto max-h-[95vh]">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-[#ff4757] font-bold flex items-center justify-center transition-colors cursor-pointer"
        >✕</button>

        {/* Logo */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-[#ff4757] to-[#ff6b81] flex items-center justify-center text-3xl shadow-lg shadow-rose-200">
            🐾
          </div>
          <h3 className="text-xl font-extrabold text-slate-800">
            {mode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản Mới'}
          </h3>
          {message && (
            <p className="text-xs text-slate-500 mt-1 px-2">{message}</p>
          )}
        </div>

        {/* Tab Switch */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-5 gap-1">
          {['login','register'].map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {m === 'login' ? '🔑 Đăng Nhập' : '✨ Đăng Ký'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-[#ff6b81] focus:bg-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Mật khẩu</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-[#ff6b81] focus:bg-white outline-none transition-all"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] disabled:opacity-60 text-white text-sm font-bold shadow-md shadow-rose-200 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <><span className="animate-spin">⏳</span> Đang đăng nhập...</> : '🔑 Đăng Nhập Ngay'}
            </button>

            {/* Quick Demo */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-center text-[11px] text-slate-400 font-semibold mb-2.5">⚡ Thử nhanh 1 chạm (Demo Mode)</p>
              <div className="grid grid-cols-4 gap-1.5">
                <button type="button" onClick={() => handleQuickDemo('male')}
                  className="py-2 px-1 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-[11px] font-bold text-slate-700 hover:text-[#ff4757] flex items-center justify-center gap-1 transition-all cursor-pointer">
                  🐶 Nuôi Nam
                </button>
                <button type="button" onClick={() => handleQuickDemo('female')}
                  className="py-2 px-1 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-[11px] font-bold text-slate-700 hover:text-[#ff4757] flex items-center justify-center gap-1 transition-all cursor-pointer">
                  🐱 Nuôi Nữ
                </button>
                <button type="button" onClick={() => handleQuickDemo('doctor')}
                  className="py-2 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm">
                  🩺 Bác Sĩ
                </button>
                <button type="button" onClick={() => handleQuickDemo('admin')}
                  className="py-2 px-1 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm">
                  🛡️ Admin
                </button>
              </div>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Role Switch */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Bạn là</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'user',   label: '🐾 Chủ Nuôi Thú Cưng' },
                  { val: 'doctor', label: '🩺 Bác Sĩ Thú Y' },
                ].map(({ val, label }) => (
                  <button
                    key={val} type="button" onClick={() => setRole(val)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                      role === val
                        ? 'border-[#ff4757] bg-rose-50 text-[#ff4757]'
                        : 'border-slate-200 text-slate-600 hover:border-rose-200'
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Họ & Tên</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder={role === 'doctor' ? 'BS. Nguyễn Văn A' : 'Nguyễn Văn A'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-[#ff6b81] focus:bg-white outline-none transition-all"
              />
            </div>

            {role === 'doctor' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Tên Phòng Khám / Bệnh Viện</label>
                  <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)}
                    placeholder="Bệnh viện Thú y 24/7"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-[#ff6b81] focus:bg-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Chuyên Khoa</label>
                  <input type="text" value={specialty} onChange={e => setSpecialty(e.target.value)}
                    placeholder="Nội khoa, Ngoại khoa, Da liễu..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-[#ff6b81] focus:bg-white outline-none transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-[#ff6b81] focus:bg-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Mật khẩu <span className="font-normal text-slate-400">(tối thiểu 6 ký tự)</span></label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-[#ff6b81] focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Avatar preview note */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium flex items-start gap-2">
              <span className="text-base">🐾</span>
              <span>Avatar sẽ tự động chọn ngẫu nhiên ảnh chó/mèo dễ thương khi đăng ký. Bạn có thể đổi sau trong hồ sơ.</span>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] disabled:opacity-60 text-white text-sm font-bold shadow-md shadow-rose-200 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading
                ? <><span className="animate-spin">⏳</span> Đang tạo tài khoản...</>
                : (role === 'doctor' ? '🩺 Đăng Ký Bác Sĩ' : '🐾 Tạo Tài Khoản')}
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-4">
          {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-[#ff4757] font-bold hover:underline cursor-pointer"
          >
            {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  );
}
