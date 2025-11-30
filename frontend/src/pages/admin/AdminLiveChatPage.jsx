import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Users, XCircle } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const AdminLiveChatPage = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, closed: 0 });
  const [filterStatus, setFilterStatus] = useState('');
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchConversations();

    // Poll for new messages every 3 seconds
    pollInterval.current = setInterval(() => {
      fetchConversations();
      if (selectedConversation) {
        fetchConversationMessages(selectedConversation.id);
      }
    }, 3000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [filterStatus]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const response = await api.get(`/chat/all-conversations${params}`);
      if (response.data.status === 'success') {
        setConversations(response.data.conversations);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationMessages = async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversation/${conversationId}`);
      if (response.data.status === 'success') {
        setMessages(response.data.conversation.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    await fetchConversationMessages(conversation.id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const response = await api.post('/chat/message', {
        conversationId: selectedConversation.id,
        message: newMessage.trim(),
      });

      if (response.data.status === 'success') {
        setMessages([...messages, response.data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCloseConversation = async (conversationId) => {
    if (!confirm('Close this conversation?')) return;

    try {
      await api.put(`/chat/conversation/${conversationId}/close`);
      fetchConversations();
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      alert('Conversation closed!');
    } catch (error) {
      console.error('Failed to close conversation:', error);
      alert('Failed to close conversation');
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
            <MessageSquare size={32} />
            Live Chat Management
          </h1>
          <p className="text-secondary">Manage user conversations in real-time</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Users size={24} className="text-gray-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800 mb-1">{stats.total}</p>
            <p className="text-sm text-gray-600">Total Conversations</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">{stats.active}</p>
            <p className="text-sm opacity-90">Active Chats</p>
          </div>

          <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <XCircle size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">{stats.closed}</p>
            <p className="text-sm opacity-90">Closed</p>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ height: '600px' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              {/* Filter */}
              <div className="p-4 border-b border-gray-200">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Conversations</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No conversations</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-all ${
                        selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-800">{conv.user.name}</h4>
                          <p className="text-xs text-gray-500">{conv.user.email}</p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.messages[0] && (
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {conv.messages[0].message}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">{formatDate(conv.lastMessageAt)}</p>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            conv.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {conv.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary to-secondary text-white">
                    <div>
                      <h3 className="font-semibold">{selectedConversation.user.name}</h3>
                      <p className="text-sm opacity-90">{selectedConversation.user.email}</p>
                    </div>
                    {selectedConversation.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleCloseConversation(selectedConversation.id)}
                        className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                      >
                        <XCircle size={16} />
                        Close Chat
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No messages yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                                msg.senderType === 'ADMIN'
                                  ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-none'
                                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
                              }`}
                            >
                              <p className="break-words">{msg.message}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  msg.senderType === 'ADMIN' ? 'text-white opacity-75' : 'text-gray-500'
                                }`}
                              >
                                {formatTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  {selectedConversation.status === 'ACTIVE' && (
                    <div className="p-4 border-t border-gray-200">
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your reply..."
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          disabled={sending}
                        />
                        <button
                          type="submit"
                          disabled={sending || !newMessage.trim()}
                          className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {sending ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <Send size={20} />
                              <span className="hidden sm:inline">Send</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MessageSquare size={64} className="mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLiveChatPage;