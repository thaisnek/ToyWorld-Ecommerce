import { useSearchParams } from 'react-router-dom';
import './CheckoutPage.css';

export default function PaymentResultPage({ navigate }) {
  const [searchParams] = useSearchParams();
  const gateway = searchParams.get('gateway') || (searchParams.has('vnp_ResponseCode') ? 'VNPAY' : 'MOMO');
  const resultCode = searchParams.get('resultCode') || searchParams.get('vnp_ResponseCode');
  const message = searchParams.get('message');
  const orderId = searchParams.get('orderId') || searchParams.get('vnp_TxnRef');

  const isSuccess = resultCode === '0' || resultCode === '00';
  const providerName = gateway === 'VNPAY' ? 'VNPay' : 'MoMo';

  return (
    <div className="checkout-page">
      <div className="checkout-inner">
        <div className="order-success" style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--card-bg)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
          <div className="success-icon" style={{ fontSize: 64, marginBottom: 16 }}>{isSuccess ? '🎉' : '❌'}</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 12, color: isSuccess ? 'var(--success)' : 'var(--danger)' }}>
            {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
          </h2>
          <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
            {message ? decodeURIComponent(message) : (isSuccess ? `Cảm ơn bạn đã thanh toán qua ${providerName}.` : `Đã có lỗi xảy ra trong quá trình thanh toán ${providerName}.`)}
          </p>
          {orderId && (
            <div className="order-id" style={{ fontSize: 18, background: 'var(--light)', display: 'inline-block', padding: '8px 16px', borderRadius: 8 }}>
              Mã giao dịch / Đơn hàng: <strong>{orderId}</strong>
            </div>
          )}

          <div className="success-actions" style={{ marginTop: 32, display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('orders')}>📦 Xem đơn hàng</button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('home')}>🏠 Về trang chủ</button>
          </div>
        </div>
      </div>
    </div>
  );
}
