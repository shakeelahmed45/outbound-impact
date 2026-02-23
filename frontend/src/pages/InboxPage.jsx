import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Plus, Users, Mail, Send, X, Eye, Reply,
  Trash2, CheckCircle, AlertCircle, Search, Star,
  Inbox, SendHorizontal, Loader2, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const InboxPage = () => {
  const { user } = useAuthStore();

  // ═══════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════
  const [messageTab, setMessageTab] = useState('internal');
  const [folder, setFolder] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({ internal: 0, external: 0, total: 0 });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [composeType, setComposeType] = useState('internal');
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeParentId, setComposeParentId] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const [teamRecipients, setTeamRecipients] = useState([]);

  // ═══════════════════════════════════════════
  // Fetch
  // ═══════════════════════════════════════════
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ type: messageTab, folder, page, limit: 50 });
      if (searchQuery) params.append('search', searchQuery);

      const res = await api.get(`/messages?${params.toString()}`);
      if (res.data.status === 'success') {
        setMessages(res.data.messages || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [messageTab, folder, page, searchQuery]);

  const fetchUnreadCounts = async () => {
    try {
      const res = await api.get('/messages/unread-count');
      if (res.data.status === 'success') {
        setUnreadCounts(res.data.unread);
      }
    } catch {
      // Non-critical
    }
  };

  const fetchTeamRecipients = async () => {
    try {
      const res = await api.get('/messages/team-recipients');
      if (res.data.status === 'success') {
        setTeamRecipients(res.data.recipients || []);
      }
    } catch {
      console.log('Team recipients not available');
    }
  };

  useEffect(() => {
    document.title = 'Inbox | Outbound Impact';
    fetchUnreadCounts();
    fetchTeamRecipients();
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    setPage(1);
  }, [messageTab, folder, searchQuery]);

  // ═══════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════
  const handleMarkRead = async (msgId) => {
    try {
      await api.put(`/messages/${msgId}/read`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m));
      fetchUnreadCounts();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleToggleStar = async (msgId, e) => {
    e?.stopPropagation();
    try {
      const res = await api.put(`/messages/${msgId}/star`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, starred: res.data.starred } : m));
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  const handleDelete = async (msgId) => {
    try {
      await api.delete(`/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setTotal(prev => prev - 1);
      if (selectedMessage?.id === msgId) setSelectedMessage(null);
      fetchUnreadCounts();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleViewMessage = (msg) => {
    setSelectedMessage(msg);
    if (!msg.read && folder === 'inbox') {
      handleMarkRead(msg.id);
    }
  };

  const handleReply = (msg) => {
    const isExternal = msg.type === 'external';
    setComposeType(isExternal ? 'external' : 'internal');

    if (folder === 'sent') {
      // Replying to a sent message — send to the original recipient
      setComposeTo(isExternal ? (msg.toEmail || '') : (msg.recipient?.email || msg.recipient?.id || ''));
    } else {
      // Replying to a received message — send back to sender
      setComposeTo(isExternal ? (msg.sender?.email || '') : (msg.sender?.email || msg.sender?.id || ''));
    }

    setComposeSubject(msg.subject?.startsWith('Re: ') ? msg.subject : `Re: ${msg.subject}`);
    setComposeBody('');
    setComposeParentId(msg.id);
    setSelectedMessage(null);
    setShowCompose(true);
  };

  // ═══════════════════════════════════════════
  // Send
  // ═══════════════════════════════════════════
  const handleSend = async () => {
    if (!composeTo || !composeSubject || !composeBody) return;
    setSending(true);
    setSendError('');

    try {
      const endpoint = composeType === 'internal' ? '/messages/internal' : '/messages/external';
      const res = await api.post(endpoint, {
        to: composeTo,
        subject: composeSubject,
        body: composeBody,
        parentId: composeParentId,
      });

      if (res.data.status === 'success') {
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setShowCompose(false);
          resetCompose();
          fetchMessages();
          fetchUnreadCounts();
        }, 2000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send';
      setSendError(msg);

      // Fallback for external — open mailto
      if (composeType === 'external') {
        window.open(`mailto:${composeTo}?subject=${encodeURIComponent(composeSubject)}&body=${encodeURIComponent(composeBody)}`, '_blank');
        setSent(true);
        setTimeout(() => { setSent(false); setShowCompose(false); resetCompose(); }, 2000);
      }
    } finally {
      setSending(false);
    }
  };

  const resetCompose = () => {
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setComposeParentId(null);
    setSendError('');
    setComposeType('internal');
  };

  // ═══════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════
  const getInitials = (name) => {
    if (!name) return '?';
    if (name.includes('@')) return name[0].toUpperCase();
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSenderName = (msg) => {
    if (folder === 'sent') {
      return msg.recipient?.name || msg.toEmail || 'Unknown';
    }
    return msg.sender?.name || msg.fromName || 'Unknown';
  };

  const getSenderLabel = (msg) => {
    if (folder === 'sent') return `To: ${msg.recipient?.name || msg.toEmail || 'Unknown'}`;
    return msg.sender?.name || msg.fromName || 'Unknown';
  };

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Inbox</h1>
            <p className="text-gray-500 text-sm">Communicate with your team and external contacts</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fetchMessages()} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1.5">
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => { resetCompose(); setShowCompose(true); }}
              className="gradient-btn text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 text-sm"
            >
              <Plus size={18} /> Compose
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm bg-white"
          />
        </div>

        {/* Folder Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFolder('inbox')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              folder === 'inbox' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Inbox size={16} /> Inbox
          </button>
          <button
            onClick={() => setFolder('sent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              folder === 'sent' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <SendHorizontal size={16} /> Sent
          </button>
        </div>

        {/* Message Type Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setMessageTab('internal')}
              className={`flex-1 px-6 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                messageTab === 'internal'
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Users size={18} />
              Internal Team
              {unreadCounts.internal > 0 && folder === 'inbox' && (
                <span className="bg-purple-700 text-white text-xs px-2 py-0.5 rounded-full">{unreadCounts.internal}</span>
              )}
            </button>
            <button
              onClick={() => setMessageTab('external')}
              className={`flex-1 px-6 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                messageTab === 'external'
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Mail size={18} />
              External Emails
              {unreadCounts.external > 0 && folder === 'inbox' && (
                <span className="bg-purple-700 text-white text-xs px-2 py-0.5 rounded-full">{unreadCounts.external}</span>
              )}
            </button>
          </div>

          {/* Message List */}
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin text-purple-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">
                  {searchQuery ? 'No messages match your search' : `No ${messageTab} messages in ${folder}`}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                        !msg.read && folder === 'inbox'
                          ? 'bg-purple-50/50 border-purple-200'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleViewMessage(msg)}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${
                            messageTab === 'internal'
                              ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                              : 'bg-gray-400'
                          }`}>
                            {getInitials(getSenderName(msg))}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm truncate ${!msg.read && folder === 'inbox' ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                                {getSenderLabel(msg)}
                              </p>
                              {!msg.read && folder === 'inbox' && (
                                <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0"></span>
                              )}
                            </div>
                            <p className={`text-sm truncate ${!msg.read && folder === 'inbox' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {msg.subject}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          {msg.emailStatus === 'sent' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded font-medium">Delivered</span>
                          )}
                          {msg.emailStatus === 'failed' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">Failed</span>
                          )}
                          <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 truncate ml-12">{msg.body?.substring(0, 120)}</p>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1.5 mt-2.5 ml-12" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleReply(msg)}
                          className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 flex items-center gap-1 font-medium"
                        >
                          <Reply size={12} /> Reply
                        </button>
                        <button
                          onClick={(e) => handleToggleStar(msg.id, e)}
                          className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1 font-medium ${
                            msg.starred ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <Star size={12} fill={msg.starred ? 'currentColor' : 'none'} /> {msg.starred ? 'Starred' : 'Star'}
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="text-xs px-2.5 py-1 bg-gray-50 text-gray-500 rounded-md hover:bg-red-50 hover:text-red-600 flex items-center gap-1 font-medium"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs text-gray-500">{page}/{totalPages}</span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* VIEW MESSAGE MODAL */}
      {/* ═══════════════════════════════════════════ */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMessage(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="gradient-btn text-white px-6 py-4 rounded-t-xl flex items-center justify-between flex-shrink-0">
              <div className="min-w-0 flex-1 mr-4">
                <h3 className="font-bold truncate">{selectedMessage.subject}</h3>
                <p className="text-white/80 text-sm truncate">
                  {folder === 'sent' ? `To: ${selectedMessage.recipient?.name || selectedMessage.toEmail || 'Unknown'}` : `From: ${selectedMessage.sender?.name || selectedMessage.fromName || 'Unknown'}`}
                </p>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="p-2 hover:bg-white/20 rounded-lg flex-shrink-0">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-xs text-gray-500 mb-4">{formatTime(selectedMessage.createdAt)}</p>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedMessage.body}</p>
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => handleReply(selectedMessage)}
                className="flex-1 px-4 py-2.5 gradient-btn text-white rounded-lg font-medium flex items-center justify-center gap-2 text-sm"
              >
                <Reply size={16} /> Reply
              </button>
              <button
                onClick={() => handleDelete(selectedMessage.id)}
                className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 flex items-center gap-2 text-sm"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* COMPOSE MESSAGE MODAL */}
      {/* ═══════════════════════════════════════════ */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="gradient-btn text-white px-6 py-4 rounded-t-xl flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold">Compose Message</h2>
                <p className="text-white/80 text-sm">Send internal or external messages</p>
              </div>
              <button onClick={() => { setShowCompose(false); resetCompose(); }} className="p-2 hover:bg-white/20 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Success */}
            {sent ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={40} className="text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-600 text-sm">
                  {composeType === 'internal' ? 'Your team message has been delivered.' : `Email sent to ${composeTo}`}
                </p>
              </div>
            ) : (
              <>
                {/* Form */}
                <div className="flex-1 overflow-y-auto p-6">
                  {sendError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{sendError}</p>
                    </div>
                  )}

                  {/* Type Toggle */}
                  <div className="flex gap-2 mb-5">
                    <button
                      onClick={() => { setComposeType('internal'); setComposeTo(''); setSendError(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        composeType === 'internal' ? 'gradient-btn text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Users size={16} /> Internal Team
                    </button>
                    <button
                      onClick={() => { setComposeType('external'); setComposeTo(''); setSendError(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        composeType === 'external' ? 'gradient-btn text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Mail size={16} /> External Email
                    </button>
                  </div>

                  {/* To */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      To {composeType === 'internal' ? '(Team Member)' : '(Email Address)'}
                    </label>
                    {composeType === 'internal' ? (
                      <select
                        value={composeTo}
                        onChange={(e) => setComposeTo(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm"
                      >
                        <option value="">Select team member...</option>
                        {teamRecipients.map(r => (
                          <option key={r.id} value={r.email}>
                            {r.name || r.email} ({r.role || 'Member'})
                          </option>
                        ))}
                        {teamRecipients.length > 1 && <option value="all">All Team Members</option>}
                      </select>
                    ) : (
                      <input
                        type="email"
                        value={composeTo}
                        onChange={(e) => setComposeTo(e.target.value)}
                        placeholder="recipient@example.com"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm"
                      />
                    )}
                  </div>

                  {/* Subject */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Enter message subject..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm"
                    />
                  </div>

                  {/* Body */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                    <textarea
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder="Type your message here..."
                      rows={6}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm resize-none"
                    />
                  </div>

                  {composeType === 'external' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>External Email:</strong> Sent via Resend with your address as reply-to.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-xl">
                  <button
                    onClick={() => { setShowCompose(false); resetCompose(); }}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-600 hover:bg-gray-100 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !composeTo || !composeSubject || !composeBody}
                    className="px-5 py-2.5 gradient-btn text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {sending ? (
                      <><Loader2 size={16} className="animate-spin" /> Sending...</>
                    ) : (
                      <><Send size={16} /> Send {composeType === 'internal' ? 'Message' : 'Email'}</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default InboxPage;
