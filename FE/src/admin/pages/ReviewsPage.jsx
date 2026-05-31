import { useCallback, useEffect, useState } from 'react';
import { adminApi, productApi, formatDate } from '../../services/api';

const LIMIT = 10;

export default function ReviewsPage({ showToast }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    productApi.getAll({ size: 500 })
      .then(data => setProducts(data?.content || data?.products || []))
      .catch(() => {});
  }, []);

  const fetchReviews = useCallback(() => {
    setLoading(true);
    const params = { page, size: LIMIT };
    const loader = selectedProductId
      ? adminApi.getReviewsByProduct(selectedProductId, params)
      : adminApi.getReviews(params);

    loader
      .then((data) => {
        const rows = data?.reviews || data?.content || [];
        setReviews(rows);
        setTotal(data?.total ?? data?.totalElements ?? rows.length);
      })
      .catch(() => showToast?.('Lỗi tải đánh giá', 'error'))
      .finally(() => setLoading(false));
  }, [page, selectedProductId, showToast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSelectProduct = (pid) => {
    setSelectedProductId(pid);
    setPage(1);
  };

  const handleApprove = async (id) => {
    try {
      await adminApi.approveReview(id);
      showToast?.('Đã duyệt đánh giá');
      fetchReviews();
    } catch (err) { showToast?.(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa đánh giá này?')) return;
    try {
      await adminApi.deleteReview(id);
      showToast?.('Đã xóa');
      if (reviews.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        fetchReviews();
      }
    } catch (err) { showToast?.(err.message, 'error'); }
  };

  const pendingCount = reviews.filter(r => !r.approved).length;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <label className="form-label">Lọc đánh giá theo sản phẩm:</label>
          <select
            className="form-input"
            value={selectedProductId}
            onChange={e => handleSelectProduct(e.target.value)}
            style={{ maxWidth: 500 }}
          >
            <option value="">Tất cả sản phẩm</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            ⭐ Đánh giá ({total})
            {pendingCount > 0 && <span style={{ color: 'var(--warn)', fontSize: 13 }}> · {pendingCount} chờ duyệt trên trang này</span>}
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading">⏳ Đang tải...</div>
          ) : reviews.length === 0 ? (
            <div className="empty"><div className="empty-icon">✅</div><div className="empty-text">Không có đánh giá nào</div></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Khách hàng</th>
                  <th>Đánh giá</th>
                  <th>Nhận xét</th>
                  <th>Trạng thái</th>
                  <th>Ngày</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map(r => (
                  <tr key={r.id}>
                    <td>{r.productName || '—'}</td>
                    <td>{r.customerName || '—'}</td>
                    <td>{'⭐'.repeat(Number(r.rating || 0))}</td>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ fontSize: 12, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.comment}</div>
                    </td>
                    <td>
                      <span className={`badge ${r.approved ? 'badge-active' : 'badge-inactive'}`}>
                        {r.approved ? '✅ Đã duyệt' : '⏳ Chờ duyệt'}
                      </span>
                    </td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!r.approved && (
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(r.id)}>✅ Duyệt</button>
                        )}
                        <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(r.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{'<'}</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>{'>'}</button>
        </div>
      )}
    </div>
  );
}
