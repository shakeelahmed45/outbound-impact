import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Users, XCircle, Star, History, ThumbsUp, AlertCircle } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const AdminLiveChatPage = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, closed: 0, withFeedback: 0, averageRating: 0 });
  const [filterStatus, setFilterStatus] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [userHistory, setUserHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
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
        // Update selected conversation with full data
        setSelectedConversation(response.data.conversation);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  // 🆕 NEW: Fetch user's complete chat history
  const fetchUserHistory = async (userId) => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/chat/user/${userId}/history`);
      if (response.data.status === 'success') {
        setUserHistory(response.data);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Failed to fetch user history:', error);
      alert('Failed to load chat history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setShowHistory(false);
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
      await api.patch(`/chat/conversation/${conversationId}/close`);
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

  // 🆕 NEW: Render star rating
  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

          {/* 🆕 NEW: Feedback Stats Card */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <ThumbsUp size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">{stats.averageRating?.toFixed(1) || '0.0'}</p>
            <p className="text-sm opacity-90">Avg Rating ({stats.withFeedback} reviews)</p>
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
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-800">{conv.user.name}</h4>
                            {/* 🆕 NEW: User chat count badge */}
                            {conv.userChatCount && conv.userChatCount.total > 1 && (
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                                {conv.userChatCount.total} chats
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{conv.user.email}</p>
                          
                          {/* 🆕 NEW: Feedback rating display */}
                          {conv.feedbackRating && (
                            <div className="flex items-center gap-2 mt-1">
                              {renderStars(conv.feedbackRating)}
                              {conv.feedbackComment && (
                                <span className="text-xs text-gray-500" title={conv.feedbackComment}>
                                  💬
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {conv._count?.messages > 0 && conv.status === 'ACTIVE' && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {conv._count.messages}
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
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">{selectedConversation.user.name}</h3>
                        <p className="text-xs text-gray-500">{selectedConversation.user.email}</p>
                        
                        {/* 🆕 NEW: Show feedback if exists */}
                        {selectedConversation.feedbackRating && (
                          <div className="flex items-center gap-2 mt-2">
                            {renderStars(selectedConversation.feedbackRating)}
                            {selectedConversation.feedbackComment && (
                              <p className="text-xs text-gray-600 italic">
                                "{selectedConversation.feedbackComment}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* 🆕 NEW: View History Button */}
                        <button
                          onClick={() => fetchUserHistory(selectedConversation.userId)}
                          disabled={loadingHistory}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          <History size={16} />
                          {loadingHistory ? 'Loading...' : 'View History'}
                        </button>
                        
                        {selectedConversation.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleCloseConversation(selectedConversation.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Close Chat
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 🆕 NEW: User History Modal */}
                  {showHistory && userHistory && (
                    <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={20} className="text-yellow-600" />
                          <h4 className="font-semibold text-gray-800">Chat History for {userHistory.user?.name}</h4>
                        </div>
                        <button
                          onClick={() => setShowHistory(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Total Chats:</p>
                          <p className="font-bold text-gray-800">{userHistory.stats.totalChats}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Active:</p>
                          <p className="font-bold text-green-600">{userHistory.stats.activeChats}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Closed:</p>
                          <p className="font-bold text-gray-600">{userHistory.stats.closedChats}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg Rating:</p>
                          <p className="font-bold text-yellow-600">{userHistory.stats.averageRating.toFixed(1)} ⭐</p>
                        </div>
                      </div>
                      <div className="mt-3 max-h-32 overflow-y-auto">
                        <p className="text-xs text-gray-600 font-semibold mb-2">Past Conversations:</p>
                        {userHistory.conversations.slice(0, 5).map((conv) => (
                          <div key={conv.id} className="text-xs text-gray-700 py-1 border-b border-yellow-100">
                            {formatDate(conv.createdAt)} - {conv.status} 
                            {conv.feedbackRating && ` - ${conv.feedbackRating}⭐`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`mb-4 flex ${msg.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            msg.senderType === 'ADMIN'
                              ? 'bg-primary text-white'
                              : 'bg-white border border-gray-200 text-gray-800'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-xs mt-1 ${msg.senderType === 'ADMIN' ? 'text-gray-200' : 'text-gray-500'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  {selectedConversation.status === 'ACTIVE' && (
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <button
                          type="submit"
                          disabled={sending || !newMessage.trim()}
                          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <Send size={18} />
                          {sending ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare size={64} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Select a conversation to start chatting</p>
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
