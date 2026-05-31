import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';

const EMPTY = { name:'', contactPerson:'', contactPhone:'', contactEmail:'', address:'', contractInfo:'', active:true };

export default function SuppliersPage({ showToast }) {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);

  const fetch = () => { setLoading(true); adminApi.getSuppliers().then(setList).catch(()=>showToast('Lỗi','error')).finally(()=>setLoading(false)); };
  useEffect(()=>{ fetch(); },[]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit   = (s) => { setEditing(s); setForm({...s}); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name) { showToast('Nhập tên nhà cung cấp','error'); return; }
    setSaving(true);
    try {
      editing ? await adminApi.updateSupplier(editing.id, form) : await adminApi.createSupplier(form);
      showToast(editing?'Đã cập nhật':'Đã thêm nhà cung cấp');
      setShowModal(false); fetch();
    } catch(err) { showToast(err.message,'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa nhà cung cấp này?')) return;
    try { await adminApi.deleteSupplier(id); showToast('Đã xóa'); fetch(); }
    catch(err) { showToast(err.message,'error'); }
  };

  const upd = (f,v) => setForm(p=>({...p,[f]:v}));

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body" style={{ padding:16 }}>
          <button className="btn btn-primary" onClick={openCreate}>+ Thêm nhà cung cấp</button>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">🚚 Nhà cung cấp ({list.length})</div></div>
        <div className="card-body">
          {loading ? <div className="loading">⏳</div> : (
            <table>
              <thead><tr><th>Tên NCC</th><th>Người liên hệ</th><th>Điện thoại</th><th>Email</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
              <tbody>
                {list.map(s=>(
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.contactPerson||'—'}</td>
                    <td>{s.contactPhone||'—'}</td>
                    <td>{s.contactEmail||'—'}</td>
                    <td><span className={`badge ${s.active?'badge-active':'badge-inactive'}`}>{s.active?'Hoạt động':'Ngừng'}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(s)}>✏️</button>
                        <button className="btn btn-ghost btn-sm" style={{ color:'#dc2626' }} onClick={()=>handleDelete(s.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing?'✏️ Sửa NCC':'➕ Thêm NCC'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Tên NCC *</label><input className="form-input" value={form.name} onChange={e=>upd('name',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Người liên hệ</label><input className="form-input" value={form.contactPerson} onChange={e=>upd('contactPerson',e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Số điện thoại</label><input className="form-input" value={form.contactPhone} onChange={e=>upd('contactPhone',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.contactEmail} onChange={e=>upd('contactEmail',e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Địa chỉ</label><input className="form-input" value={form.address} onChange={e=>upd('address',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Thông tin hợp đồng</label><textarea className="form-input" rows={2} value={form.contractInfo} onChange={e=>upd('contractInfo',e.target.value)} style={{ resize:'none' }} /></div>
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={form.active} onChange={e=>upd('active',e.target.value==='true')}>
                <option value="true">Hoạt động</option><option value="false">Ngừng hợp tác</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Đang lưu...':'💾 Lưu'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

