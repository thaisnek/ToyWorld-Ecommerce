import { useState, useEffect } from 'react';

export default function LoyaltyPage({ showToast }) {
  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">🎁 Chương trình Điểm thưởng</div>
        </div>
        <div className="card-body" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏗️</div>
          <h3 style={{ fontFamily: 'var(--font-display, inherit)', fontSize: 22, marginBottom: 12 }}>Tính năng đang phát triển</h3>
          <p style={{ color: '#6b7280', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
            Hệ thống tích điểm đang hoạt động tự động cho khách hàng khi hoàn thành đơn hàng.
            <br />
            Quản lý chính sách điểm thưởng và danh sách tài khoản sẽ được bổ sung trong phiên bản tiếp theo.
          </p>
          <div style={{ marginTop: 24, padding: 20, background: '#f0f9ff', borderRadius: 12, maxWidth: 500, margin: '24px auto 0' }}>
            <h4 style={{ marginBottom: 12, color: '#2563eb' }}>📌 Hiện tại hệ thống tự động:</h4>
            <ul style={{ textAlign: 'left', lineHeight: 2, color: '#4b5563', fontSize: 14 }}>
              <li>✅ Tích điểm khi khách hàng xác nhận nhận hàng (Complete Order)</li>
              <li>✅ Hiển thị điểm thưởng trong trang <strong>Hồ sơ</strong> của khách hàng</li>
              <li>✅ Ghi log lịch sử tích điểm cho từng giao dịch</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
