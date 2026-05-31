import { useState, useEffect } from 'react';
import { adminApi, formatPrice, formatDate } from '../../services/api';

const EMPTY_TYPE = { typeVoucher: 'FIXED_AMOUNT', value: '', maxValue: '', minValue: '' };
const EMPTY_VOUCHER = { codeVoucher: '', typeVoucherId: '', fromDate: '', toDate: '', quantity: 100 };

export default function VouchersPage({ showToast }) {
  const [vouchers, setVouchers]       = useState([]);
  const [voucherTypes, setVoucherTypes] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('vouchers');

  // Modal states
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showTypeModal, setShowTypeModal]       = useState(false);
  const [voucherForm, setVoucherForm] = useState(EMPTY_VOUCHER);
  const [typeForm, setTypeForm]       = useState(EMPTY_TYPE);
  const [saving, setSaving]           = useState(false);

  const fetchVouchers = () => {
    setLoading(true);
    adminApi.getVouchers()
      .then(data => setVouchers(data?.content || data || []))
      .catch(() => showToast('Lỗi tải voucher', 'error'))
      .finally(() => setLoading(false));
  };

  const fetchTypes = () => {
    adminApi.getVoucherTypes()
      .then(data => setVoucherTypes(data || []))
      .catch(() => showToast('Lỗi tải loại voucher', 'error'));
  };

  useEffect(() => { fetchVouchers(); fetchTypes(); }, []);

  // ── Create Voucher Type ──
  const handleSaveType = async () => {
    if (!typeForm.value) { showToast('Nhập giá trị giảm', 'error'); return; }
    setSaving(true);
    try {
      await adminApi.createVoucherType(typeForm);
      showToast('Đã tạo loại voucher');
      setShowTypeModal(false);
      fetchTypes();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  // ── Create Voucher ──
  const handleSaveVoucher = async () => {
    if (!voucherForm.codeVoucher) { showToast('Nhập mã voucher', 'error'); return; }
    if (!voucherForm.typeVoucherId) { showToast('Chọn loại voucher', 'error'); return; }
    if (!voucherForm.fromDate || !voucherForm.toDate) { showToast('Chọn ngày hiệu lực', 'error'); return; }
    setSaving(true);
    try {
      // Convert date inputs to LocalDateTime format
      const payload = {
        ...voucherForm,
        typeVoucherId: Number(voucherForm.typeVoucherId),
        quantity: Number(voucherForm.quantity),
        fromDate: voucherForm.fromDate + 'T00:00:00',
        toDate:   voucherForm.toDate   + 'T23:59:59',
      };
      await adminApi.createVoucher(payload);
      showToast('Đã tạo voucher');
      setShowVoucherModal(false);
      fetchVouchers();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa voucher này?')) return;
    try { await adminApi.deleteVoucher(id); showToast('Đã xóa'); fetchVouchers(); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const isValid = (v) => {
    const now = new Date();
    if (v.toDate && new Date(v.toDate) < now) return false;
    if (v.quantity !== undefined && v.usedCount !== undefined && v.usedCount >= v.quantity) return false;
    return true;
  };

  const typeLabel = (t) => t === 'PERCENTAGE' ? 'Phần trăm (%)' : 'Số tiền cố định (VNĐ)';

  return (
    <div>
      {/* Tab navigation */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={`btn ${activeTab === 'vouchers' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('vouchers')}>🏷️ Mã giảm giá</button>
          <button className={`btn ${activeTab === 'types' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('types')}>📋 Loại khuyến mãi</button>
          <div style={{ flex: 1 }} />
          {activeTab === 'vouchers' && (
            <button className="btn btn-primary" onClick={() => { setVoucherForm(EMPTY_VOUCHER); setShowVoucherModal(true); }}>+ Tạo Voucher</button>
          )}
          {activeTab === 'types' && (
            <button className="btn btn-primary" onClick={() => { setTypeForm(EMPTY_TYPE); setShowTypeModal(true); }}>+ Tạo loại KM</button>
          )}
        </div>
      </div>

      {/* ── Vouchers Tab ── */}
      {activeTab === 'vouchers' && (
        <div className="card">
          <div className="card-header"><div className="card-title">🏷️ Mã giảm giá ({vouchers.length})</div></div>
          <div className="card-body">
            {loading ? <div className="loading">⏳</div> : (
              <table>
                <thead><tr><th>Mã Voucher</th><th>Loại</th><th>Giá trị</th><th>Đã dùng / Tổng</th><th>Từ ngày</th><th>Đến ngày</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                <tbody>
                  {vouchers.map(v => (
                    <tr key={v.id}>
                      <td><strong style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{v.codeVoucher}</strong></td>
                      <td>{typeLabel(v.typeVoucher)}</td>
                      <td>
                        {v.typeVoucher === 'PERCENTAGE'
                          ? `${v.value}% (tối đa ${formatPrice(v.maxValue || 0)})`
                          : formatPrice(v.value || 0)}
                      </td>
                      <td>{v.usedCount || 0} / {v.quantity}</td>
                      <td>{formatDate(v.fromDate)}</td>
                      <td>{formatDate(v.toDate)}</td>
                      <td><span className={`badge ${isValid(v) ? 'badge-active' : 'badge-inactive'}`}>{isValid(v) ? 'Còn hiệu lực' : 'Hết hiệu lực'}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(v.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Types Tab ── */}
      {activeTab === 'types' && (
        <div className="card">
          <div className="card-header"><div className="card-title">📋 Loại khuyến mãi ({voucherTypes.length})</div></div>
          <div className="card-body">
            <table>
              <thead><tr><th>ID</th><th>Loại</th><th>Giá trị</th><th>Giảm tối đa</th><th>Đơn tối thiểu</th><th>Ngày tạo</th></tr></thead>
              <tbody>
                {voucherTypes.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{typeLabel(t.typeVoucher)}</td>
                    <td>{t.typeVoucher === 'PERCENTAGE' ? `${t.value}%` : formatPrice(t.value || 0)}</td>
                    <td>{t.maxValue ? formatPrice(t.maxValue) : '—'}</td>
                    <td>{t.minValue ? formatPrice(t.minValue) : '—'}</td>
                    <td>{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Voucher Modal ── */}
      {showVoucherModal && (
        <div className="modal-overlay" onClick={() => setShowVoucherModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">➕ Tạo Voucher</div>
              <button className="modal-close" onClick={() => setShowVoucherModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Mã Voucher *</label>
                <input className="form-input" placeholder="SALE50K" style={{ textTransform: 'uppercase' }} value={voucherForm.codeVoucher} onChange={e => setVoucherForm(p => ({ ...p, codeVoucher: e.target.value.toUpperCase() }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Loại khuyến mãi *</label>
                <select className="form-input" value={voucherForm.typeVoucherId} onChange={e => setVoucherForm(p => ({ ...p, typeVoucherId: e.target.value }))}>
                  <option value="">-- Chọn loại --</option>
                  {voucherTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {typeLabel(t.typeVoucher)} — {t.typeVoucher === 'PERCENTAGE' ? `${t.value}%` : formatPrice(t.value)} {t.minValue ? `(đơn từ ${formatPrice(t.minValue)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Số lượng</label>
                <input className="form-input" type="number" min={1} value={voucherForm.quantity} onChange={e => setVoucherForm(p => ({ ...p, quantity: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Từ ngày *</label>
                <input className="form-input" type="date" value={voucherForm.fromDate} onChange={e => setVoucherForm(p => ({ ...p, fromDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Đến ngày *</label>
                <input className="form-input" type="date" value={voucherForm.toDate} onChange={e => setVoucherForm(p => ({ ...p, toDate: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowVoucherModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveVoucher} disabled={saving}>{saving ? 'Đang lưu...' : '💾 Tạo Voucher'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Type Modal ── */}
      {showTypeModal && (
        <div className="modal-overlay" onClick={() => setShowTypeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">➕ Tạo loại khuyến mãi</div>
              <button className="modal-close" onClick={() => setShowTypeModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Loại giảm giá *</label>
                <select className="form-input" value={typeForm.typeVoucher} onChange={e => setTypeForm(p => ({ ...p, typeVoucher: e.target.value }))}>
                  <option value="FIXED_AMOUNT">Số tiền cố định (VNĐ)</option>
                  <option value="PERCENTAGE">Phần trăm (%)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Giá trị giảm *</label>
                <input className="form-input" type="number" placeholder={typeForm.typeVoucher === 'PERCENTAGE' ? 'VD: 10 (%)' : 'VD: 20000'} value={typeForm.value} onChange={e => setTypeForm(p => ({ ...p, value: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Giảm tối đa (cho %)</label>
                <input className="form-input" type="number" placeholder="VD: 50000" value={typeForm.maxValue} onChange={e => setTypeForm(p => ({ ...p, maxValue: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Đơn tối thiểu</label>
                <input className="form-input" type="number" placeholder="VD: 150000" value={typeForm.minValue} onChange={e => setTypeForm(p => ({ ...p, minValue: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowTypeModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveType} disabled={saving}>{saving ? 'Đang lưu...' : '💾 Tạo'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
