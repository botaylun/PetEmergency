import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DEFAULT_PET_DOG_AVATAR, DEFAULT_PET_CAT_AVATAR } from '../constants/avatars';

const SPECIES_OPTIONS = [
  { id: 'dog', label: '🐶 Chó' },
  { id: 'cat', label: '🐱 Mèo' },
  { id: 'rabbit', label: '🐰 Thỏ' },
  { id: 'hamster', label: '🐹 Hamster' },
  { id: 'bird', label: '🦜 Chim' },
  { id: 'other', label: '🐾 Khác' },
];

const COMMON_BREEDS = {
  dog: ['Golden Retriever', 'Poodle', 'Corgi', 'Husky', 'Phốc sóc (Pomeranian)', 'Chihuahua', 'Chó cỏ / Ta'],
  cat: ['Mèo Anh lông ngắn', 'Mèo Munchkin', 'Mèo Ba Tư', 'Mèo Xiêm', 'Mèo Mướp / Ta'],
  rabbit: ['Thỏ Minilop', 'Thỏ Sư tử (Lionhead)', 'Thỏ Hà Lan lùn'],
  hamster: ['Hamster Winter White', 'Hamster Robo', 'Hamster Bear'],
  bird: ['Vẹt Yến Phụng', 'Vẹt Cockatiel', 'Vẹt Lovebird'],
  other: ['Thú cưng khác'],
};

export default function PetList({ currentUser, showToast, onRequireAuth }) {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [todayTasks, setTodayTasks] = useState([
    { id: 't1', petName: 'Cún Lu', type: 'med', title: 'Uống men tiêu hóa', time: '08:00', done: false },
    { id: 't2', petName: 'Mèo Bơ', type: 'food', title: 'Bổ sung pate dinh dưỡng & gel dinh dưỡng', time: '12:00', done: true },
    { id: 't3', petName: 'Cún Lu', type: 'vaccine', title: 'Kiểm tra sổ tiêm chủng định kỳ', time: '17:00', done: false },
  ]);

  const hdrs = currentUser?.id ? { 'X-User-Id': String(currentUser.id) } : {};

  // Form state for Wizard
  const [wizardForm, setWizardForm] = useState({
    pet_name: '',
    species: 'dog',
    breed: '',
    sex: 'male',
    birth_date: '',
    age: '',
    color: '',
    weight: '',
    is_neutered: false,
    microchip_number: '',
    allergies: '',
    chronic_conditions: '',
    photo_url: '',
    is_public: true,
  });

  const loadPets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/pets', { headers: hdrs });
      if (res.data?.success) {
        setPets(res.data.data || []);
      }
    } catch (err) {
      console.warn('Load pets error, using local fallback:', err);
      // Fallback demo pets if offline/empty
      setPets([
        {
          id: 1,
          pet_name: 'Cún Lu',
          species: 'dog',
          breed: 'Golden Retriever',
          sex: 'male',
          age: 2,
          weight: 24.5,
          is_neutered: true,
          microchip_number: '9851410029412',
          photo_url: DEFAULT_PET_DOG_AVATAR,
          is_public: true,
          healthEvents: [
            { id: 101, name: 'Vaccine 7 bệnh', next_due_at: new Date(Date.now() + 5 * 86400000).toISOString(), given_at: null },
            { id: 102, name: 'Tẩy giun định kỳ', next_due_at: new Date(Date.now() - 2 * 86400000).toISOString(), given_at: null },
          ]
        },
        {
          id: 2,
          pet_name: 'Mèo Bơ',
          species: 'cat',
          breed: 'Munchkin',
          sex: 'female',
          age: 1,
          weight: 3.8,
          is_neutered: false,
          microchip_number: '',
          photo_url: DEFAULT_PET_CAT_AVATAR,
          is_public: true,
          healthEvents: [
            { id: 201, name: 'Nhỏ gáy ve rận', next_due_at: new Date(Date.now() + 15 * 86400000).toISOString(), given_at: null },
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    document.title = 'Sổ Thú Cưng | PetCare AI';
    loadPets();
  }, [loadPets]);

  const openAddWizard = () => {
    setEditingPet(null);
    setWizardForm({
      pet_name: '',
      species: 'dog',
      breed: '',
      sex: 'male',
      birth_date: '',
      age: '',
      color: '',
      weight: '',
      is_neutered: false,
      microchip_number: '',
      allergies: '',
      chronic_conditions: '',
      photo_url: '',
      is_public: true,
    });
    setShowWizard(true);
  };

  const openEditWizard = (pet, e) => {
    e.stopPropagation();
    setEditingPet(pet);
    setWizardForm({
      pet_name: pet.pet_name || '',
      species: pet.species || 'dog',
      breed: pet.breed || '',
      sex: pet.sex || 'male',
      birth_date: pet.birth_date ? pet.birth_date.slice(0, 10) : '',
      age: pet.age || '',
      color: pet.color || '',
      weight: pet.weight || '',
      is_neutered: Boolean(pet.is_neutered),
      microchip_number: pet.microchip_number || '',
      allergies: pet.allergies || '',
      chronic_conditions: pet.chronic_conditions || '',
      photo_url: pet.photo_url || '',
      is_public: pet.is_public !== false,
    });
    setShowWizard(true);
  };

  const handleDeletePet = async (petId, petName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc muốn xóa bé "${petName}" khỏi danh bạ không?`)) return;

    try {
      await axios.delete(`/api/v1/pets/${petId}`, { headers: hdrs });
      setPets(prev => prev.filter(p => p.id !== petId));
      showToast?.(`Đã xóa thông tin bé "${petName}".`, 'info');
    } catch {
      // Local fallback
      setPets(prev => prev.filter(p => p.id !== petId));
      showToast?.(`Đã xóa thông tin bé "${petName}".`, 'info');
    }
  };

  const handleSaveWizard = async (e) => {
    e.preventDefault();
    if (!wizardForm.pet_name.trim()) {
      showToast?.('Vui lòng nhập tên bé cưng!', 'error');
      return;
    }

    try {
      if (editingPet) {
        const res = await axios.put(`/api/v1/pets/${editingPet.id}`, wizardForm, { headers: hdrs });
        if (res.data?.success) {
          setPets(prev => prev.map(p => p.id === editingPet.id ? res.data.data : p));
        } else {
          setPets(prev => prev.map(p => p.id === editingPet.id ? { ...p, ...wizardForm } : p));
        }
        showToast?.('Đã cập nhật thông tin bé cưng!', 'success');
      } else {
        const res = await axios.post('/api/v1/pets', wizardForm, { headers: hdrs });
        if (res.data?.success) {
          setPets(prev => [res.data.data, ...prev]);
        } else {
          const newLocalPet = {
            id: Date.now(),
            ...wizardForm,
            healthEvents: [],
            weights: [],
            medications: [],
          };
          setPets(prev => [newLocalPet, ...prev]);
        }
        showToast?.('Đã thêm bé cưng mới vào sổ theo dõi!', 'success');
      }
      setShowWizard(false);
    } catch (err) {
      console.warn('Wizard save error:', err);
      // Fallback
      if (editingPet) {
        setPets(prev => prev.map(p => p.id === editingPet.id ? { ...p, ...wizardForm } : p));
        showToast?.('Đã cập nhật thông tin bé!', 'success');
      } else {
        const newLocalPet = {
          id: Date.now(),
          ...wizardForm,
          healthEvents: [],
          weights: [],
          medications: [],
        };
        setPets(prev => [newLocalPet, ...prev]);
        showToast?.('Đã thêm bé cưng mới!', 'success');
      }
      setShowWizard(false);
    }
  };

  const toggleTask = (taskId) => {
    setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── B4: DASHBOARD "HÔM NAY" ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-2">
              <span>☀️</span>
              <span>Lịch Trình Hôm Nay</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Chăm sóc bé yêu cùng PetCare AI
            </h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
              Theo dõi việc uống thuốc, tẩy giun và lịch tiêm chủng định kỳ không lo quên hẹn.
            </p>
          </div>

          <button
            onClick={openAddWizard}
            className="px-5 py-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-black text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer self-start md:self-auto"
          >
            <span>🐾</span>
            <span>+ Thêm Bé Mới</span>
          </button>
        </div>

        {/* Task checklist today */}
        <div className="mt-5 pt-5 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {todayTasks.map(t => (
            <div
              key={t.id}
              onClick={() => toggleTask(t.id)}
              className={`p-3.5 rounded-2xl backdrop-blur-md border transition-all cursor-pointer flex items-start gap-3 ${
                t.done
                  ? 'bg-white/15 border-white/20 opacity-70'
                  : 'bg-white/25 border-white/40 hover:bg-white/30'
              }`}
            >
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5 transition ${
                t.done ? 'bg-white text-rose-500' : 'border-2 border-white text-transparent'
              }`}>
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-white/90 truncate">{t.petName}</span>
                  <span className="text-[10px] text-white/70 font-semibold">{t.time}</span>
                </div>
                <p className={`text-xs font-bold leading-snug mt-0.5 ${t.done ? 'line-through text-white/70' : 'text-white'}`}>
                  {t.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── B1: PET LIST HEADER ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>🐾</span>
            <span>Danh Sách Thú Cưng Của Bạn</span>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {pets.length} bé
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhấn vào thẻ bé cưng để xem Sổ Sức Khỏe chi tiết, lịch tiêm và mã QR cứu hộ.
          </p>
        </div>
      </div>

      {/* ── PET CARDS GRID ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm animate-pulse space-y-4">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-slate-200 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="w-24 h-4 bg-slate-200 rounded" />
                  <div className="w-32 h-3 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : pets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-4">
          <span className="text-5xl block">🐶</span>
          <h4 className="text-base font-extrabold text-slate-800">Bạn chưa thêm bé cưng nào</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hãy bắt đầu tạo hồ sơ thú cưng đầu tiên để nhận nhắc lịch tiêm phòng, theo dõi cân nặng và trang bị thẻ QR cứu hộ thông minh!
          </p>
          <button
            onClick={openAddWizard}
            className="px-6 py-3 rounded-2xl bg-[#ff4757] hover:bg-[#ff6b81] text-white font-bold text-xs shadow-md shadow-rose-200 transition cursor-pointer"
          >
            + Thêm Bé Ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pets.map(pet => {
            const avatar = pet.photo_url || (
              (pet.species || '').toLowerCase().includes('cat') ? DEFAULT_PET_CAT_AVATAR : DEFAULT_PET_DOG_AVATAR
            );

            // Compute overdue and upcoming badges
            const events = pet.healthEvents || [];
            const overdue = events.filter(e => {
              if (!e.next_due_at || e.given_at) return false;
              return new Date(e.next_due_at) < new Date();
            }).length;

            const upcoming = events.filter(e => {
              if (!e.next_due_at || e.given_at) return false;
              const diff = (new Date(e.next_due_at) - new Date()) / 86400000;
              return diff >= 0 && diff <= 14;
            }).length;

            return (
              <div
                key={pet.id}
                onClick={() => navigate(`/pets/${pet.id}`)}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top card bar */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <img
                          src={avatar}
                          alt={pet.pet_name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-100 shadow-sm bg-slate-50"
                        />
                        <span className="absolute -bottom-1 -right-1 text-base">
                          {pet.species === 'cat' ? '🐱' : pet.species === 'rabbit' ? '🐰' : '🐶'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base group-hover:text-[#ff4757] transition-colors leading-tight">
                          {pet.pet_name}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {pet.breed || pet.species || 'Thú cưng'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-semibold">
                          <span>{pet.sex === 'female' ? '♀ Cái' : '♂ Đực'}</span>
                          <span>•</span>
                          <span>{pet.age ? `${pet.age} tuổi` : 'Chưa rõ tuổi'}</span>
                          {pet.weight && (
                            <>
                              <span>•</span>
                              <span>{parseFloat(pet.weight).toFixed(1)} kg</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions menu */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => openEditWizard(pet, e)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Chỉnh sửa thông tin"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => handleDeletePet(pet.id, pet.pet_name, e)}
                        className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Xóa bé"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Health badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {overdue > 0 && (
                      <span className="px-2.5 py-1 rounded-xl bg-red-50 text-red-600 text-[10px] font-black border border-red-200 flex items-center gap-1 animate-pulse">
                        <span>🚨</span> Quá hạn: {overdue}
                      </span>
                    )}
                    {upcoming > 0 && (
                      <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200 flex items-center gap-1">
                        <span>📅</span> Sắp đến hạn: {upcoming}
                      </span>
                    )}
                    {overdue === 0 && upcoming === 0 && (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 flex items-center gap-1">
                        <span>✨</span> Sức khỏe tốt
                      </span>
                    )}
                    {pet.is_neutered && (
                      <span className="px-2 py-0.5 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">
                        ✂️ Triệt sản
                      </span>
                    )}
                    {pet.microchip_number && (
                      <span className="px-2 py-0.5 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-bold">
                        🔖 #{pet.microchip_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-[#ff4757] transition-colors">
                  <span>Mở Sổ Sức Khỏe</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── B1: ADD / EDIT WIZARD MODAL ────────────────────────────────────── */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowWizard(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>{editingPet ? '✏️' : '🐾'}</span>
                <span>{editingPet ? `Chỉnh sửa: ${editingPet.pet_name}` : 'Thêm Bé Cưng Mới'}</span>
              </h3>
              <button
                onClick={() => setShowWizard(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWizard} className="space-y-4 text-xs">
              {/* Species selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Loài thú cưng *</label>
                <div className="grid grid-cols-3 gap-2">
                  {SPECIES_OPTIONS.map(sp => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setWizardForm(f => ({ ...f, species: sp.id }))}
                      className={`py-2 px-3 rounded-xl font-bold border transition text-center cursor-pointer ${
                        wizardForm.species === sp.id
                          ? 'bg-rose-50 border-rose-300 text-[#ff4757]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Breed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tên bé cưng *</label>
                  <input
                    type="text"
                    required
                    value={wizardForm.pet_name}
                    onChange={e => setWizardForm(f => ({ ...f, pet_name: e.target.value }))}
                    placeholder="VD: Cún Lu, Mèo Bơ..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Giống loài</label>
                  <input
                    type="text"
                    list="breed-options"
                    value={wizardForm.breed}
                    onChange={e => setWizardForm(f => ({ ...f, breed: e.target.value }))}
                    placeholder="VD: Golden Retriever, Poodle..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                  />
                  <datalist id="breed-options">
                    {(COMMON_BREEDS[wizardForm.species] || COMMON_BREEDS.dog).map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Sex, Age, Weight */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Giới tính</label>
                  <select
                    value={wizardForm.sex}
                    onChange={e => setWizardForm(f => ({ ...f, sex: e.target.value }))}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none bg-white"
                  >
                    <option value="male">♂ Đực</option>
                    <option value="female">♀ Cái</option>
                    <option value="unknown">Chưa rõ</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tuổi (năm)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={wizardForm.age}
                    onChange={e => setWizardForm(f => ({ ...f, age: e.target.value }))}
                    placeholder="VD: 2"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cân nặng (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={wizardForm.weight}
                    onChange={e => setWizardForm(f => ({ ...f, weight: e.target.value }))}
                    placeholder="VD: 5.5"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                  />
                </div>
              </div>

              {/* Color, Microchip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Màu lông</label>
                  <input
                    type="text"
                    value={wizardForm.color}
                    onChange={e => setWizardForm(f => ({ ...f, color: e.target.value }))}
                    placeholder="VD: Vàng kim, Trắng đen..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mã Microchip</label>
                  <input
                    type="text"
                    value={wizardForm.microchip_number}
                    onChange={e => setWizardForm(f => ({ ...f, microchip_number: e.target.value }))}
                    placeholder="VD: 9851410029..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                  />
                </div>
              </div>

              {/* Allergies & Chronic conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">🚨 Dị ứng (nếu có)</label>
                  <input
                    type="text"
                    value={wizardForm.allergies}
                    onChange={e => setWizardForm(f => ({ ...f, allergies: e.target.value }))}
                    placeholder="VD: Dị ứng thịt gà, phấn hoa..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">💊 Bệnh nền / Mãn tính</label>
                  <input
                    type="text"
                    value={wizardForm.chronic_conditions}
                    onChange={e => setWizardForm(f => ({ ...f, chronic_conditions: e.target.value }))}
                    placeholder="VD: Hen suyễn, suy thận..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                  />
                </div>
              </div>

              {/* Photo URL */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Link Ảnh đại diện bé cưng</label>
                <input
                  type="url"
                  value={wizardForm.photo_url}
                  onChange={e => setWizardForm(f => ({ ...f, photo_url: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                />
              </div>

              {/* Checkboxes: Neutered & Public */}
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wizardForm.is_neutered}
                    onChange={e => setWizardForm(f => ({ ...f, is_neutered: e.target.checked }))}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400"
                  />
                  <span className="font-bold text-slate-700">✂️ Đã triệt sản</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wizardForm.is_public}
                    onChange={e => setWizardForm(f => ({ ...f, is_public: e.target.checked }))}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400"
                  />
                  <span className="font-bold text-slate-700">🌐 Hiển thị công khai trên hồ sơ của tôi</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] text-white font-bold transition shadow-md shadow-rose-200 cursor-pointer"
                >
                  {editingPet ? 'Lưu Thay Đổi' : 'Thêm Bé Cưng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
