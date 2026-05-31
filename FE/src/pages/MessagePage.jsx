import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, messageApi } from '../services/api';
import './MessagePage.css';

const STAFF_ROLES = ['ADMIN', 'SALES_STAFF'];

const buildUserLookup = (users = []) => {
  const byId = {};
  const byFullName = {};

  users.forEach((item) => {
    const username = item.userName || item.username;
    if (!username) return;
    if (item.id) byId[String(item.id)] = username;
    if (item.fullName) byFullName[item.fullName] = username;
  });

  return { byId, byFullName };
};

const getConversationUsername = (conv) =>
  conv?.otherUsername || conv?.otherUserName || conv?.receiverUsername || '';

const normalizeConversation = (conv, userLookup = { byId: {}, byFullName: {} }) => {
  const mappedUsername = userLookup.byId[String(conv.otherUserId)] || userLookup.byFullName[conv.otherFullName];
  const rawUsername = getConversationUsername(conv);
  const safeUsername = mappedUsername || (rawUsername && !/\s/.test(rawUsername) ? rawUsername : '');

  return {
    ...conv,
    otherUsername: safeUsername,
    otherDisplayName: conv.otherFullName || rawUsername || safeUsername,
  };
};

const getRequestedReceiver = (routeState) =>
  routeState?.receiverUsername || routeState?.receiverUserName || routeState?.toUsername || (routeState?.startWithAdmin ? 'admin' : '');

export default function MessagePage({ navigate, routeState }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [newMsg, setNewMsg]               = useState(routeState?.draftMessage || '');
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [newConvUsername, setNewConvUsername] = useState('');
  const [showNewConv, setShowNewConv]     = useState(false);
  const messagesEndRef = useRef(null);
  const routeStartHandledRef = useRef(false);
  const userLookupRef = useRef({ byId: {}, byFullName: {} });

  useEffect(() => {
    if (!user) return;
    const canLoadUsers = STAFF_ROLES.includes(user.role);
    Promise.all([
      messageApi.getConversations(),
      canLoadUsers ? adminApi.getUsers({ size: 500 }).catch(() => null) : Promise.resolve(null),
    ])
      .then(([conversationData, usersData]) => {
        const users = usersData?.content || usersData?.users || usersData || [];
        const lookup = buildUserLookup(Array.isArray(users) ? users : []);
        userLookupRef.current = lookup;
        setConversations((conversationData || []).map((conv) => normalizeConversation(conv, lookup)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const loadMessages = async (conv) => {
    const normalizedConv = normalizeConversation(conv, userLookupRef.current);
    setActiveConv(normalizedConv);
    setNewConvUsername(normalizedConv.otherUsername || '');
    try {
      const data = await messageApi.getMessages(normalizedConv.id, { size: 50 });
      setMessages(data?.content || data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { setMessages([]); }
  };

  useEffect(() => {
    if (!user || loading || routeStartHandledRef.current) return;
    const receiverUsername = getRequestedReceiver(routeState)?.trim();
    if (!receiverUsername) return;

    routeStartHandledRef.current = true;
    if (routeState?.draftMessage) setNewMsg(routeState.draftMessage);

    const existingConv = conversations.find((conv) =>
      (conv.otherUsername || '').toLowerCase() === receiverUsername.toLowerCase()
    );

    if (existingConv) {
      setShowNewConv(false);
      loadMessages(existingConv);
      return;
    }

    setActiveConv(null);
    setMessages([]);
    setNewConvUsername(receiverUsername);
    setShowNewConv(true);
  }, [user, loading, conversations, routeState]);

  const handleSend = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const receiverUsername = activeConv
        ? getConversationUsername(activeConv)
        : newConvUsername.trim();

      if (!receiverUsername) {
        alert('Không xác định được username người nhận. Vui lòng chọn lại cuộc trò chuyện.');
        return;
      }

      await messageApi.send({ receiverUsername, content: newMsg });
      setNewMsg('');

      // Reload messages
      if (activeConv) {
        const data = await messageApi.getMessages(activeConv.id, { size: 50 });
        setMessages(data?.content || data || []);
      }

      // Reload conversations
      const convs = await messageApi.getConversations();
      const normalizedConvs = (convs || []).map((conv) => normalizeConversation(conv, userLookupRef.current));
      setConversations(normalizedConvs);

      // If new conversation, select it
      if (!activeConv && normalizedConvs.length > 0) {
        const newConv = normalizedConvs.find((conv) =>
          getConversationUsername(conv).toLowerCase() === receiverUsername.toLowerCase()
        ) || normalizedConvs[0];
        setActiveConv(newConv);
        setNewConvUsername(newConv.otherUsername || '');
        const data = await messageApi.getMessages(newConv.id, { size: 50 });
        setMessages(data?.content || data || []);
        setShowNewConv(false);
      }

      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) { alert('Lỗi gửi tin: ' + err.message); }
    finally { setSending(false); }
  };

  const handleStartNewConv = () => {
    setShowNewConv(true);
    setActiveConv(null);
    setMessages([]);
    // Default: customer chats with admin
    if (user.role === 'CUSTOMER') setNewConvUsername('admin');
    else setNewConvUsername('');
  };

  if (!user) return (
    <div className="msg-page">
      <div className="msg-empty">
        <div style={{ fontSize: 64 }}>💬</div>
        <h3>Đăng nhập để nhắn tin</h3>
        <button className="btn btn-primary" onClick={() => navigate('login')}>Đăng nhập</button>
      </div>
    </div>
  );

  return (
    <div className="msg-page">
      <div className="msg-layout">
        {/* Sidebar - Conversations */}
        <div className="msg-sidebar">
          <div className="msg-sidebar-header">
            <h3>💬 Tin nhắn</h3>
            <button className="btn btn-primary btn-sm" onClick={handleStartNewConv}>+ Mới</button>
          </div>
          <div className="msg-conv-list">
            {loading ? <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>⏳ Đang tải...</div> : (
              conversations.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Chưa có cuộc trò chuyện nào.
                  <br />
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={handleStartNewConv}>Bắt đầu trò chuyện</button>
                </div>
              ) : conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`msg-conv-item ${activeConv?.id === conv.id ? 'active' : ''}`}
                  onClick={() => { loadMessages(conv); setShowNewConv(false); }}
                >
                  <div className="msg-conv-avatar">👤</div>
                  <div className="msg-conv-info">
                    <div className="msg-conv-name">{conv.otherDisplayName || conv.otherFullName || conv.otherUsername}</div>
                    <div className="msg-conv-last">{conv.lastMessage || 'Chưa có tin nhắn'}</div>
                  </div>
                  {conv.lastMessageAt && (
                    <div className="msg-conv-time">{new Date(conv.lastMessageAt).toLocaleDateString('vi-VN')}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="msg-chat">
          {!activeConv && !showNewConv ? (
            <div className="msg-empty">
              <div style={{ fontSize: 48 }}>💬</div>
              <h3>Chọn cuộc trò chuyện</h3>
              <p style={{ color: '#9ca3af' }}>Chọn từ danh sách bên trái hoặc bắt đầu cuộc trò chuyện mới</p>
            </div>
          ) : (
            <>
              <div className="msg-chat-header">
                <div className="msg-chat-avatar">👤</div>
                <div>
                  <div className="msg-chat-name">{activeConv?.otherDisplayName || activeConv?.otherFullName || activeConv?.otherUsername || newConvUsername || 'Cuộc trò chuyện mới'}</div>
                  <div className="msg-chat-status">Đang trực tuyến</div>
                </div>
              </div>

              {showNewConv && !activeConv && user.role !== 'CUSTOMER' && (
                <div style={{ padding: '12px 16px', background: '#f0f9ff', borderBottom: '1px solid #e5e7eb' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Username người nhận:</label>
                  <input className="form-input" placeholder="Nhập username..." value={newConvUsername} onChange={e => setNewConvUsername(e.target.value)} style={{ maxWidth: 300 }} />
                </div>
              )}

              <div className="msg-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`msg-bubble-wrap ${msg.senderId === user.id ? 'mine' : 'theirs'}`}>
                    {msg.senderId !== user.id && <div className="msg-sender-name">{msg.senderName}</div>}
                    <div className={`msg-bubble ${msg.senderId === user.id ? 'mine' : 'theirs'}`}>
                      {msg.content}
                    </div>
                    <div className="msg-time">{new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="msg-input-area">
                <input
                  className="msg-input"
                  placeholder="Nhập tin nhắn..."
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={sending || (!activeConv && !newConvUsername.trim())}
                />
                <button
                  className="msg-send-btn"
                  onClick={handleSend}
                  disabled={sending || !newMsg.trim() || (!activeConv && !newConvUsername.trim())}
                >
                  {sending ? '⏳' : '📤'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
