import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, MessageSquare, User, Shield, MessagesSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';

const LiveChatPage = () => {
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchConversation();

    // Poll for new messages every 3 seconds
    pollInterval.current = setInterval(() => {
      if (conversation) {
        fetchMessages();
      }
    }, 3000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    try {
      const response = await api.get('/chat/conversation');
      if (response.data.status === 'success') {
        setConversation(response.data.conversation);
        setMessages(response.data.conversation.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get('/chat/conversation');
      if (response.data.status === 'success') {
        setMessages(response.data.conversation.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await api.post('/chat/message', {
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

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/settings')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              <MessagesSquare size={32} />
              Live Chat Support
            </h1>
            <p className="text-secondary">Chat with our support team in real-time</p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-6 rounded-xl text-center">
            <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="text-white" size={24} />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Fast Response</h3>
            <p className="text-sm text-gray-600">Get answers within minutes</p>
          </div>

          <div className="bg-green-50 p-6 rounded-xl text-center">
            <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="text-white" size={24} />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Real-Time</h3>
            <p className="text-sm text-gray-600">Chat with live support agents</p>
          </div>

          <div className="bg-purple-50 p-6 rounded-xl text-center">
            <div className="bg-purple-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="text-white" size={24} />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Expert Help</h3>
            <p className="text-sm text-gray-600">Specialized support team</p>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ height: '500px' }}>
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 bg-gradient-to-r from-primary to-secondary text-white">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare size={20} />
                Support Chat
              </h3>
              <p className="text-sm opacity-90">
                {conversation?.status === 'ACTIVE' ? 'Active conversation' : 'Start a new conversation'}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare size={64} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No messages yet</h3>
                  <p className="text-gray-500">Send a message to start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === 'USER' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                          msg.senderType === 'USER'
                            ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-none'
                            : 'bg-gray-200 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <p className="break-words">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.senderType === 'USER' ? 'text-white opacity-75' : 'text-gray-500'
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
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LiveChatPage;