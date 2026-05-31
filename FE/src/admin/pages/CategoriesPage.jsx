import { useEffect, useState } from 'react';
import { adminApi, categoryApi } from '../../services/api';

const EMPTY_CATEGORY = {
  name: '',
  active: true,
  parentId: '',
};

export function CategoriesPage({ showToast }) {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [saving, setSaving] = useState(false);

  const loadCategories = () => {
    setLoading(true);
    categoryApi.getAll()
      .then(setCats)
      .catch(() => showToast('Lỗi tải danh mục', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_CATEGORY);
    setShowModal(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setForm({
      name: category.name || '',
      active: category.active,
      parentId: category.parentId || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nhập tên danh mục', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      active: form.active,
      parentId: form.parentId ? Number(form.parentId) : null,
      imageUrl: '',
    };

    try {
      if (editing) {
        await adminApi.updateCategory(editing.id, payload);
      } else {
        await adminApi.createCategory(payload);
      }

      showToast(editing ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục');
      setShowModal(false);
      loadCategories();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa danh mục này?')) return;

    try {
      await adminApi.deleteCategory(id);
      showToast('Đã xóa danh mục');
      loadCategories();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <button className="btn btn-primary" onClick={openCreate}>+ Thêm danh mục</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📂 Danh mục ({cats.length})</div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading">⏳</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tên danh mục</th>
                  <th>Danh mục cha</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((category) => (
                  <tr key={category.id}>
                    <td><strong>{category.name}</strong></td>
                    <td>{cats.find((item) => item.id === category.parentId)?.name || 'Gốc'}</td>
                    <td>
                      <span className={`badge ${category.active ? 'badge-active' : 'badge-inactive'}`}>
                        {category.active ? 'Hiện' : 'Ẩn'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(category)}>✏️</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(category.id)}>🗑️</button>
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing ? '✏️ Sửa danh mục' : '➕ Thêm danh mục'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Tên danh mục *</label>
              <input className="form-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Danh mục cha</label>
              <select className="form-select" value={form.parentId} onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}>
                <option value="">-- Không có (Danh mục gốc) --</option>
                {cats.filter((category) => category.id !== editing?.id).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={String(form.active)} onChange={(event) => setForm((current) => ({ ...current, active: event.target.value === 'true' }))}>
                <option value="true">Hiển thị</option>
                <option value="false">Ẩn</option>
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : '💾 Lưu'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoriesPage;
