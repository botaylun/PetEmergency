import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DEFAULT_PET_DOG_AVATAR, DEFAULT_PET_CAT_AVATAR } from '../constants/avatars';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
};
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
};

const StatusPill = ({ days }) => {
  if (days === null) return null;
  if (days < 0)   return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black border border-red-200">Quá hạn {Math.abs(days)} ngày</span>;
  if (days === 0)  return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black border border-amber-200">Đến hạn hôm nay</span>;
  if (days <= 7)   return <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-200">Còn {days} ngày</span>;
  return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">Còn {days} ngày</span>;
};

function WeightChart({ entries }) {
  if (!entries || entries.length < 2) return <div className="h-32 flex items-center justify-center text-xs text-slate-400">Cần ít nhất 2 lần cân để hiển thị biểu đồ</div>;
  const sorted = [...entries].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  const ws = sorted.map(e => parseFloat(e.weight_kg || e.weight || 0));
  const minW = Math.min(...ws), maxW = Math.max(...ws), range = maxW - minW || 1;
  const W = 400, H = 100;
  const pts = ws.map((w, i) => `${(i/(ws.length-1))*(W-20)+10},${H-10-((w-minW)/range)*(H-20)}`).join(' ');
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 to-white border border-rose-100 p-4">
      <div className="flex justify-between text-xs text-slate-500 mb-2">
        <span className="font-bold text-slate-700">Biểu đồ cân nặng</span>
        <span className="text-[10px]">{fmtDate(sorted[0]?.recorded_at)} → {fmtDate(sorted[sorted.length-1]?.recorded_at)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
        <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff4757" stopOpacity="0.25"/><stop offset="100%" stopColor="#ff4757" stopOpacity="0"/></linearGradient></defs>
        <polygon points={`10,${H} ${pts} ${(ws.length-1)/(ws.length-1)*(W-20)+10},${H}`} fill="url(#wg)"/>
        <polyline points={pts} fill="none" stroke="#ff4757" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {pts.split(' ').map((pt,i)=>{const [x,y]=pt.split(',');return <circle key={i} cx={x} cy={y} r="4" fill="#ff4757" stroke="white" strokeWidth="2"/>;})}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
        <span>{minW.toFixed(1)} kg</span><span>Hiện tại: {ws[ws.length-1].toFixed(1)} kg</span><span>{maxW.toFixed(1)} kg</span>
      </div>
    </div>
  );
}

function HealthScoreRing({ score, color, label }) {
  const hex = { emerald: '#10b981', blue: '#3b82f6', amber: '#f59e0b', rose: '#f43f5e' }[color] || '#10b981';
  const r = 45, circ = 2*Math.PI*r, dash = (score/100)*circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10"/>
        <circle cx="60" cy="60" r={r} fill="none" stroke={hex} strokeWidth="10"
          strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={circ/4} strokeLinecap="round"
          style={{transition:'stroke-dasharray 1s ease'}}/>
        <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="900" fill="#1e293b">{score}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="9" fontWeight="700" fill="#64748b">/100</text>
      </svg>
      <span className="px-3 py-1 rounded-full text-xs font-extrabold" style={{background:hex+'20',color:hex,border:`1px solid ${hex}40`}}>{label}</span>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold cursor-pointer transition">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EventCard({ event, onDelete }) {
  const days = daysUntil(event.next_due_at);
  return (
    <div className={`p-4 rounded-2xl border transition-all group ${days!==null&&days<0?'bg-red-50/50 border-red-200':'bg-white border-slate-100 hover:border-rose-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-sm text-slate-900 truncate">{event.name}</h4>
            <StatusPill days={days}/>
          </div>
          {event.vet_name && <p className="text-[11px] text-slate-400 mt-0.5">🩺 {event.vet_name}{event.clinic_name?` • ${event.clinic_name}`:''}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
            {event.given_at && <span>✅ Thực hiện: {fmtDate(event.given_at)}</span>}
            {event.next_due_at && <span>📅 Nhắc lại: {fmtDate(event.next_due_at)}</span>}
          </div>
          {event.notes && <p className="text-xs text-slate-500 mt-1 italic">{event.notes}</p>}
        </div>
        {onDelete && <button onClick={()=>onDelete(event.id)} className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs flex items-center justify-center cursor-pointer flex-shrink-0">✕</button>}
      </div>
    </div>
  );
}

function TabSection({ title, count, onAdd, addLabel, emptyIcon, emptyMsg, emptyHint, items }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900">{title} ({count})</h3>
        <button onClick={onAdd} className="px-4 py-2 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold transition shadow-md shadow-rose-200 cursor-pointer">{addLabel}</button>
      </div>
      {items.length===0 ? (
        <div className="text-center py-10 space-y-2">
          <span className="text-4xl block">{emptyIcon}</span>
          <p className="text-xs font-bold text-slate-600">{emptyMsg}</p>
          <p className="text-[11px] text-slate-400">{emptyHint}</p>
        </div>
      ) : <div className="space-y-3">{items}</div>}
    </div>
  );
}

function AddEventModal({ onClose, onSave, type }) {
  const cfg = {vaccine:{title:'💉 Thêm Lịch Tiêm Chủng',ph:'VD: Vaccine Dại, 5-in-1...'},deworming:{title:'🪱 Thêm Lịch Tẩy Giun',ph:'VD: Milbemax...'},note:{title:'📋 Thêm Ghi Chú',ph:'VD: Khám định kỳ...'}}[type]||{title:'📋 Thêm ghi chú',ph:''};
  const [form, setForm] = useState({ name:'', given_at:'', next_due_at:'', vet_name:'', clinic_name:'', notes:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal title={cfg.title} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="text-xs font-bold text-slate-700 block mb-1">Tên sự kiện *</label><input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" placeholder={cfg.ph} value={form.name} onChange={e=>set('name',e.target.value)}/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-700 block mb-1">Ngày thực hiện</label><input type="date" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" value={form.given_at} onChange={e=>set('given_at',e.target.value)}/></div>
          <div><label className="text-xs font-bold text-slate-700 block mb-1">Ngày nhắc lại</label><input type="date" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" value={form.next_due_at} onChange={e=>set('next_due_at',e.target.value)}/></div>
          <div><label className="text-xs font-bold text-slate-700 block mb-1">Tên bác sĩ</label><input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" placeholder="BS. Nguyễn..." value={form.vet_name} onChange={e=>set('vet_name',e.target.value)}/></div>
          <div><label className="text-xs font-bold text-slate-700 block mb-1">Phòng khám</label><input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" placeholder="BV PetCare..." value={form.clinic_name} onChange={e=>set('clinic_name',e.target.value)}/></div>
        </div>
        <div><label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú</label><textarea rows={2} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757] resize-none" placeholder="Ghi chú thêm..." value={form.notes} onChange={e=>set('notes',e.target.value)}/></div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition">Hủy</button>
          <button onClick={()=>{if(!form.name.trim())return;onSave(form);}} className="flex-1 py-2.5 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold cursor-pointer transition">Lưu</button>
        </div>
      </div>
    </Modal>
  );
}

function AddWeightModal({ onClose, onSave }) {
  const [form, setForm] = useState({ weight_kg:'', recorded_at:new Date().toISOString().slice(0,10), notes:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal title="⚖️ Ghi Nhận Cân Nặng" onClose={onClose}>
      <div className="space-y-3">
        <div><label className="text-xs font-bold text-slate-700 block mb-1">Cân nặng (kg) *</label><input type="number" step="0.1" min="0.1" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" placeholder="VD: 3.5" value={form.weight_kg} onChange={e=>set('weight_kg',e.target.value)}/></div>
        <div><label className="text-xs font-bold text-slate-700 block mb-1">Ngày cân *</label><input type="date" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" value={form.recorded_at} onChange={e=>set('recorded_at',e.target.value)}/></div>
        <div><label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú</label><input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" placeholder="VD: Sau ăn, trước tiêm..." value={form.notes} onChange={e=>set('notes',e.target.value)}/></div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition">Hủy</button>
          <button onClick={()=>{if(!form.weight_kg)return;onSave(form);}} className="flex-1 py-2.5 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold cursor-pointer transition">Lưu</button>
        </div>
      </div>
    </Modal>
  );
}

function AddMedModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name:'', purpose:'', dose:'', frequency:'', start_date:new Date().toISOString().slice(0,10), end_date:'', prescribed_by:'', notes:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal title="💊 Thêm Thuốc" onClose={onClose}>
      <div className="space-y-3">
        <div><label className="text-xs font-bold text-slate-700 block mb-1">Tên thuốc *</label><input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" placeholder="VD: Milbemax, Frontline..." value={form.name} onChange={e=>set('name',e.target.value)}/></div>
        <div><label className="text-xs font-bold text-slate-700 block mb-1">Mục đích</label><input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" placeholder="VD: Tẩy giun, Trị ve..." value={form.purpose} onChange={e=>set('purpose',e.target.value)}/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-700 block mb-1">Liều lượng</label><input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" placeholder="1 viên/10kg" value={form.dose} onChange={e=>set('dose',e.target.value)}/></div>
          <div><label className="text-xs font-bold text-slate-700 block mb-1">Tần suất</label><input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" placeholder="1 lần/ngày" value={form.frequency} onChange={e=>set('frequency',e.target.value)}/></div>
          <div><label className="text-xs font-bold text-slate-700 block mb-1">Từ ngày</label><input type="date" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" value={form.start_date} onChange={e=>set('start_date',e.target.value)}/></div>
          <div><label className="text-xs font-bold text-slate-700 block mb-1">Đến ngày</label><input type="date" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" value={form.end_date} onChange={e=>set('end_date',e.target.value)}/></div>
        </div>
        <div><label className="text-xs font-bold text-slate-700 block mb-1">Bác sĩ kê đơn</label><input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#ff4757]" placeholder="Tên bác sĩ..." value={form.prescribed_by} onChange={e=>set('prescribed_by',e.target.value)}/></div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition">Hủy</button>
          <button onClick={()=>{if(!form.name.trim())return;onSave(form);}} className="flex-1 py-2.5 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold cursor-pointer transition">Lưu</button>
        </div>
      </div>
    </Modal>
  );
}

const TABS = [
  { id:'overview',    icon:'🏠', label:'Tổng quan'         },
  { id:'vaccines',    icon:'💉', label:'Tiêm chủng'        },
  { id:'deworming',   icon:'🪱', label:'Sổ giun / Ký sinh' },
  { id:'weight',      icon:'⚖️', label:'Cân nặng'          },
  { id:'medications', icon:'💊', label:'Thuốc'             },
  { id:'notes',       icon:'📋', label:'Bệnh án'           },
  { id:'qr',          icon:'📱', label:'Thẻ QR'            },
];

export default function PetDetail({ currentUser, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab]         = useState('overview');
  const [pet, setPet]                     = useState(null);
  const [loading, setLoading]             = useState(true);
  const [healthEvents, setHealthEvents]   = useState([]);
  const [weights, setWeights]             = useState([]);
  const [medications, setMedications]     = useState([]);
  const [showAddEvent,  setShowAddEvent]  = useState(false);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [showAddMed,    setShowAddMed]    = useState(false);
  const [eventType, setEventType]         = useState('vaccine');

  const hdrs = currentUser?.id ? { 'X-User-Id': String(currentUser.id) } : {};

  const loadPet = useCallback(async () => {
    try {
      const r = await axios.get(`/api/v1/pets/${id}`, { headers: hdrs });
      if (r.data?.success) { setPet(r.data.data); document.title = `${r.data.data.pet_name} | Sổ Sức Khỏe | PetCare AI`; }
    } catch { showToast?.('Không thể tải thú cưng.', 'error'); }
    finally { setLoading(false); }
  }, [id]);

  const loadHealthEvents = useCallback(async () => {
    try { const r = await axios.get(`/api/v1/pets/${id}/health-events`, { headers: hdrs }); if (r.data?.success) setHealthEvents(r.data.data || []); } catch {}
  }, [id]);

  const loadWeights = useCallback(async () => {
    try { const r = await axios.get(`/api/v1/pets/${id}/weights`, { headers: hdrs }); if (r.data?.success) setWeights(r.data.data || []); } catch {}
  }, [id]);

  const loadMedications = useCallback(async () => {
    try { const r = await axios.get(`/api/v1/pets/${id}/medications`, { headers: hdrs }); if (r.data?.success) setMedications(r.data.data || []); } catch {}
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadPet(); loadHealthEvents(); loadWeights(); loadMedications();
  }, [id]);

  const vaccines   = healthEvents.filter(e => (e.event_type||'').toLowerCase().includes('vaccine'));
  const dewormings = healthEvents.filter(e => (e.event_type||'').toLowerCase().includes('deworm'));
  const notesEvts  = healthEvents.filter(e => !(e.event_type||'').toLowerCase().includes('vaccine') && !(e.event_type||'').toLowerCase().includes('deworm'));

  const overdueCount = healthEvents.filter(e => { const d=daysUntil(e.next_due_at); return d!==null&&d<0&&!e.given_at; }).length;
  const upcoming = healthEvents.filter(e => { const d=daysUntil(e.next_due_at); return d!==null&&d>=0&&d<=30; }).sort((a,b)=>new Date(a.next_due_at)-new Date(b.next_due_at));
  const latestWeight = weights.length > 0 ? [...weights].sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at))[0] : null;

  const localScore = Math.max(10, 100 - (overdueCount>0?Math.min(45,overdueCount*15):0) - ((!latestWeight&&!pet?.weight)?15:0));
  const scoreColor = localScore>=85?'emerald':localScore>=70?'blue':localScore>=50?'amber':'rose';
  const scoreLabel = localScore>=85?'Rất tốt ✨':localScore>=70?'Khá tốt':localScore>=50?'Cần lưu ý':'Báo động 🚨';
  const petAvatar = pet?.photo_url || ((pet?.species||'').toLowerCase().includes('cat') ? DEFAULT_PET_CAT_AVATAR : DEFAULT_PET_DOG_AVATAR);
  const ageText = pet?.birth_date ? (()=>{const m=Math.floor((Date.now()-new Date(pet.birth_date))/(30.44*86400000));return m>=12?`${Math.floor(m/12)} tuổi ${m%12} tháng`:`${m} tháng tuổi`;})() : (pet?.age?`${pet.age} tuổi`:'—');

  const handleAddEvent = async (form) => {
    try { const r = await axios.post(`/api/v1/pets/${id}/health-events`, {...form,event_type:eventType}, {headers:hdrs}); if(r.data?.success){setHealthEvents(p=>[r.data.data,...p]);setShowAddEvent(false);showToast?.('Đã thêm!','success');} } catch { showToast?.('Lỗi.','error'); }
  };
  const handleDeleteEvent = async (eid) => {
    if (!window.confirm('Xóa sự kiện này?')) return;
    try { await axios.delete(`/api/v1/pets/${id}/health-events/${eid}`,{headers:hdrs}); setHealthEvents(p=>p.filter(e=>e.id!==eid)); showToast?.('Đã xóa.','info'); } catch { showToast?.('Lỗi.','error'); }
  };
  const handleAddWeight = async (form) => {
    try { const r = await axios.post(`/api/v1/pets/${id}/weights`,form,{headers:hdrs}); if(r.data?.success){setWeights(p=>[r.data.data,...p]);setPet(p=>p?{...p,weight:form.weight_kg}:p);setShowAddWeight(false);showToast?.('Đã cập nhật cân nặng!','success');} } catch { showToast?.('Lỗi.','error'); }
  };
  const handleDeleteWeight = async (wid) => {
    try { await axios.delete(`/api/v1/pets/${id}/weights/${wid}`,{headers:hdrs}); setWeights(p=>p.filter(w=>w.id!==wid)); showToast?.('Đã xóa.','info'); } catch { showToast?.('Lỗi.','error'); }
  };
  const handleAddMed = async (form) => {
    try { const r = await axios.post(`/api/v1/pets/${id}/medications`,form,{headers:hdrs}); if(r.data?.success){setMedications(p=>[r.data.data,...p]);setShowAddMed(false);showToast?.('Đã thêm thuốc!','success');} } catch { showToast?.('Lỗi.','error'); }
  };
  const handleDeleteMed = async (mid) => {
    if (!window.confirm('Xóa thuốc này?')) return;
    try { await axios.delete(`/api/v1/pets/${id}/medications/${mid}`,{headers:hdrs}); setMedications(p=>p.filter(m=>m.id!==mid)); showToast?.('Đã xóa.','info'); } catch { showToast?.('Lỗi.','error'); }
  };

  if (loading) return <div className="max-w-4xl mx-auto space-y-5 animate-pulse py-8"><div className="h-48 bg-slate-200 rounded-3xl"/><div className="h-12 bg-slate-100 rounded-2xl"/><div className="h-64 bg-slate-100 rounded-3xl"/></div>;
  if (!pet) return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-4 mt-8">
      <span className="text-5xl block">😿</span>
      <h2 className="text-lg font-extrabold text-slate-900">Không tìm thấy thú cưng</h2>
      <button onClick={()=>navigate(-1)} className="px-6 py-2.5 bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold rounded-full cursor-pointer transition">← Quay lại</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300">
      {showAddEvent  && <AddEventModal  onClose={()=>setShowAddEvent(false)}  onSave={handleAddEvent}  type={eventType}/>}
      {showAddWeight && <AddWeightModal onClose={()=>setShowAddWeight(false)} onSave={handleAddWeight}/>}
      {showAddMed    && <AddMedModal    onClose={()=>setShowAddMed(false)}    onSave={handleAddMed}/>}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-32 sm:h-40 bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 relative">
          <div className="absolute inset-0 bg-black/10"/>
          <button onClick={()=>navigate(-1)} className="absolute top-4 left-4 px-3.5 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 text-xs font-bold shadow transition cursor-pointer">← Quay lại</button>
          {overdueCount>0&&<div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-black shadow-md flex items-center gap-1.5 animate-pulse">🚨 {overdueCount} mục quá hạn</div>}
        </div>
        <div className="px-6 pb-5 -mt-12 sm:-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
            <div className="relative">
              <img src={petAvatar} alt={pet.pet_name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white shadow-lg bg-slate-100"/>
              <span className="absolute -bottom-1 -right-1 text-xl">{(pet.species||'').toLowerCase().includes('cat')?'🐱':'🐶'}</span>
            </div>
            <div className="flex-1 space-y-1 pb-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{pet.pet_name}</h1>
              <p className="text-xs text-slate-500">{pet.breed||pet.species||'Thú cưng'} · {pet.sex==='male'?'♂ Đực':pet.sex==='female'?'♀ Cái':'—'} · {ageText}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {pet.is_neutered&&<span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">✂️ Đã triệt sản</span>}
                {pet.microchip_number&&<span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-200">🔖 #{pet.microchip_number}</span>}
                {pet.hardware_gps_id&&<span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">📡 GPS</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
            <div className="text-center"><strong className="text-lg font-black text-slate-900 block">{latestWeight?`${parseFloat(latestWeight.weight_kg||latestWeight.weight).toFixed(1)}kg`:(pet.weight?`${pet.weight}kg`:'—')}</strong><span className="text-[10px] text-slate-400 font-semibold">Cân nặng</span></div>
            <div className="text-center border-x border-slate-200"><strong className="text-lg font-black text-slate-900 block">{vaccines.filter(v=>v.given_at).length}</strong><span className="text-[10px] text-slate-400 font-semibold">Lần tiêm</span></div>
            <div className="text-center"><strong className="text-lg font-black text-slate-900 block">{medications.filter(m=>m.is_active!==false).length}</strong><span className="text-[10px] text-slate-400 font-semibold">Thuốc đang dùng</span></div>
          </div>
        </div>
        <div className="flex border-t border-slate-100 bg-slate-50/60 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex-shrink-0 px-4 py-3 text-xs font-extrabold border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-all ${activeTab===t.id?'border-[#ff4757] text-[#ff4757] bg-white':'border-transparent text-slate-500 hover:text-slate-800'}`}>
              <span>{t.icon}</span><span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab==='overview'&&(
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider w-full">🏅 Điểm Sức Khỏe</h3>
            <HealthScoreRing score={localScore} color={scoreColor} label={scoreLabel}/>
            <div className="w-full space-y-2 text-xs">
              <div className={`flex items-center gap-2 p-2 rounded-xl ${overdueCount===0?'bg-emerald-50':'bg-red-50'}`}><span>{overdueCount===0?'✅':'⚠️'}</span><span className="text-slate-700">{overdueCount===0?'Lịch chăm sóc đúng hạn':`${overdueCount} mục quá hạn cần xử lý`}</span></div>
              <div className={`flex items-center gap-2 p-2 rounded-xl ${(latestWeight||pet?.weight)?'bg-emerald-50':'bg-amber-50'}`}><span>{(latestWeight||pet?.weight)?'✅':'⚠️'}</span><span className="text-slate-700">{(latestWeight||pet?.weight)?'Đã có số liệu cân nặng':'Chưa ghi cân nặng gần đây'}</span></div>
            </div>
          </div>
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">📅 Nhắc Nhở Sắp Tới (30 ngày)</h3>
            {upcoming.length===0?<div className="text-center py-8 text-slate-400 text-xs"><span className="text-3xl block mb-2">🎉</span>Không có lịch nào trong 30 ngày tới!</div>:(
              <div className="space-y-2">{upcoming.slice(0,5).map(e=>(
                <div key={e.id} className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
                  <div><p className="text-xs font-bold text-slate-800">{e.name}</p><p className="text-[10px] text-slate-400">{fmtDate(e.next_due_at)}</p></div>
                  <StatusPill days={daysUntil(e.next_due_at)}/>
                </div>
              ))}</div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">📄 Thông Tin Cơ Bản</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[['Màu lông',pet.color],['Giống',pet.breed||pet.species],['Ngày sinh',fmtDate(pet.birth_date)],['Dị ứng',pet.allergies||'Không'],['Bệnh nền',pet.chronic_conditions||'Không'],['Microchip',pet.microchip_number||'Chưa gắn']].map(([k,v])=>v?(<div key={k} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100"><span className="text-slate-400 block text-[10px]">{k}</span><strong className="text-slate-800 font-bold">{v}</strong></div>):null)}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab==='vaccines'&&<TabSection title="💉 Lịch Tiêm Chủng" count={vaccines.length} onAdd={()=>{setEventType('vaccine');setShowAddEvent(true);}} addLabel="+ Thêm lịch tiêm" emptyIcon="💉" emptyMsg="Chưa có lịch tiêm chủng nào." emptyHint="Thêm lịch tiêm để theo dõi và nhận nhắc nhở đúng hạn." items={vaccines.map(e=><EventCard key={e.id} event={e} onDelete={handleDeleteEvent}/>)}/>}
      {activeTab==='deworming'&&<TabSection title="🪱 Sổ Giun / Ký Sinh Trùng" count={dewormings.length} onAdd={()=>{setEventType('deworming');setShowAddEvent(true);}} addLabel="+ Thêm lịch tẩy giun" emptyIcon="🪱" emptyMsg="Chưa có lịch tẩy giun / ký sinh trùng." emptyHint="Thêm để theo dõi chu kỳ phòng ngừa." items={dewormings.map(e=><EventCard key={e.id} event={e} onDelete={handleDeleteEvent}/>)}/>}

      {activeTab==='weight'&&(
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900">⚖️ Theo Dõi Cân Nặng</h3><button onClick={()=>setShowAddWeight(true)} className="px-4 py-2 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold transition shadow-md shadow-rose-200 cursor-pointer">+ Cân bé</button></div>
          <WeightChart entries={weights}/>
          {weights.length>0?(
            <div className="space-y-2">{[...weights].sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at)).map(w=>(
              <div key={w.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 group">
                <div><span className="font-extrabold text-slate-900 text-sm">{parseFloat(w.weight_kg||w.weight).toFixed(2)} kg</span><p className="text-[10px] text-slate-400">{fmtDate(w.recorded_at)}{w.notes?` · ${w.notes}`:''}</p></div>
                <button onClick={()=>handleDeleteWeight(w.id)} className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-lg bg-red-50 text-red-500 text-xs font-bold cursor-pointer">Xóa</button>
              </div>
            ))}</div>
          ):<div className="text-center py-8 text-slate-400 text-xs"><span className="text-3xl block mb-2">⚖️</span>Chưa có bản ghi. Bắt đầu theo dõi để vẽ biểu đồ tăng trưởng.</div>}
        </div>
      )}

      {activeTab==='medications'&&<TabSection title="💊 Thuốc Đang Sử Dụng" count={medications.length} onAdd={()=>setShowAddMed(true)} addLabel="+ Thêm thuốc" emptyIcon="💊" emptyMsg="Chưa có thuốc nào được ghi nhận." emptyHint="Thêm thuốc để theo dõi liệu trình điều trị." items={medications.map(med=>(
        <div key={med.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 transition-all group space-y-2">
          <div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h4 className="font-extrabold text-sm text-slate-900">{med.name}</h4>{med.is_active!==false&&<span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-bold border border-green-100">Đang dùng</span>}</div>{med.purpose&&<p className="text-xs text-slate-500">{med.purpose}</p>}</div><button onClick={()=>handleDeleteMed(med.id)} className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg bg-red-50 text-red-500 text-xs flex items-center justify-center cursor-pointer">✕</button></div>
          <div className="grid grid-cols-2 gap-2 text-xs">{med.dose&&<span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold">💊 {med.dose}</span>}{med.frequency&&<span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 font-semibold">🔁 {med.frequency}</span>}{med.start_date&&<span className="text-slate-500">Từ: {fmtDate(med.start_date)}</span>}{med.end_date&&<span className="text-slate-500">Đến: {fmtDate(med.end_date)}</span>}{med.prescribed_by&&<span className="col-span-2 text-slate-500">🩺 BS. {med.prescribed_by}</span>}</div>
          {med.notes&&<p className="text-xs text-slate-500 italic pt-1 border-t border-slate-100">{med.notes}</p>}
        </div>
      ))}/>}

      {activeTab==='notes'&&(
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-900">📋 Tiền Sử Bệnh &amp; Ghi Chú</h3><button onClick={()=>{setEventType('note');setShowAddEvent(true);}} className="px-4 py-2 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold transition shadow-md shadow-rose-200 cursor-pointer">+ Thêm ghi chú</button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[{label:'🚨 Dị ứng đã biết',value:pet.allergies,bg:'bg-red-50 border-red-100',text:'text-red-800'},{label:'💊 Bệnh nền / Mãn tính',value:pet.chronic_conditions,bg:'bg-amber-50 border-amber-100',text:'text-amber-800'},{label:'📜 Tiền sử bệnh',value:pet.medical_history,bg:'bg-blue-50 border-blue-100',text:'text-blue-800'}].map(({label,value,bg,text})=>(
              <div key={label} className={`p-4 rounded-2xl border ${bg}`}><span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">{label}</span><p className={`text-xs font-semibold ${text} leading-relaxed`}>{value||'Không có / chưa cập nhật'}</p></div>
            ))}
          </div>
          {notesEvts.length>0&&<div className="space-y-2 mt-2"><h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Ghi Chú Khám Bệnh</h4>{notesEvts.map(e=><EventCard key={e.id} event={e} onDelete={handleDeleteEvent}/>)}</div>}
          {notesEvts.length===0&&<div className="text-center py-6 text-slate-400 text-xs"><span className="text-3xl block mb-2">📋</span>Chưa có ghi chú khám bệnh.</div>}
        </div>
      )}

      {activeTab==='qr'&&(
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
          <h3 className="text-sm font-black text-slate-900">📱 Thẻ QR Cứu Hộ</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Khi ai đó quét mã QR trên vòng cổ của bé, họ sẽ thấy thông tin khẩn cấp và dị ứng để sơ cứu đúng cách.</p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0 w-40 h-40 bg-slate-100 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-300"><div className="text-center"><span className="text-4xl block">📱</span><span className="text-[10px] text-slate-400 font-bold mt-1 block">QR Code</span></div></div>
            <div className="flex-1 space-y-3 w-full">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 space-y-2">
                <div className="flex items-center gap-3"><img src={petAvatar} alt={pet.pet_name} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow"/><div><h4 className="font-extrabold text-slate-900 text-sm">{pet.pet_name}</h4><p className="text-xs text-slate-500">{pet.breed||pet.species}</p></div></div>
                <div className="grid grid-cols-2 gap-2 text-xs"><div className="p-2 rounded-xl bg-white/70 border border-rose-100"><span className="text-[10px] text-slate-400 block">🚨 Dị ứng</span><strong className="text-red-700">{pet.allergies||'Không'}</strong></div><div className="p-2 rounded-xl bg-white/70 border border-rose-100"><span className="text-[10px] text-slate-400 block">💊 Bệnh nền</span><strong className="text-slate-700">{pet.chronic_conditions||'Không'}</strong></div></div>
                {currentUser?.name&&<p className="text-[10px] text-slate-400 text-center pt-1 border-t border-rose-100">📞 Chủ: {currentUser.name}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={()=>{navigator.clipboard?.writeText(`${window.location.origin}/pets/${id}/qr`);showToast?.('Đã sao chép link QR!','success');}} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition">📋 Sao chép link</button>
                <button onClick={()=>window.print()} className="flex-1 py-2.5 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold cursor-pointer transition">🖨️ In thẻ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

