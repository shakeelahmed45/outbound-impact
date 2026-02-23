import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, BookOpen, Upload, QrCode, Share2, BarChart,
  Users, Settings, HelpCircle, Zap, Shield, Send,
  Mail, Phone, Clock, CheckCircle, MessageSquare,
  ChevronDown, ChevronRight, FileText, Globe
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const SupportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('guide');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    category: 'general',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Guide categories
  const categories = [
    { id: 'all', label: 'All Topics', icon: BookOpen },
    { id: 'getting-started', label: 'Getting Started', icon: Zap },
    { id: 'content', label: 'Content & Uploads', icon: Upload },
    { id: 'sharing', label: 'Sharing & QR Codes', icon: Share2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'account', label: 'Account & Billing', icon: Settings },
  ];

  // FAQ data
  const faqs = [
    {
      id: 1, category: 'getting-started',
      question: 'How do I get started with Outbound Impact?',
      answer: 'After signing up, head to your Dashboard. Click "Upload" in the sidebar to add your first content (images, videos, audio, or text). Once uploaded, you\'ll get a unique link, QR code, and NFC option to share your content.'
    },
    {
      id: 2, category: 'content',
      question: 'What types of content can I upload?',
      answer: 'You can upload images (JPG, PNG, GIF, WebP), videos (MP4, MOV), audio files (MP3, WAV), text posts, and embed links from YouTube, Vimeo, SoundCloud, and more. You can also add file attachments like PDFs and documents.'
    },
    {
      id: 3, category: 'content',
      question: 'How do I organize my content into Streams?',
      answer: 'Streams (campaigns) let you group multiple pieces of content together. Go to Content → Streams, click "Create Stream", name it, and add your uploaded content. Each stream gets its own shareable link and QR code.'
    },
    {
      id: 4, category: 'sharing',
      question: 'How do QR codes work?',
      answer: 'Each piece of content and each stream gets a unique QR code automatically. You can download the QR code as an image, customize its appearance, and place it on physical materials. When someone scans it, they\'re taken directly to your content.'
    },
    {
      id: 5, category: 'sharing',
      question: 'What is NFC and how do I use it?',
      answer: 'NFC (Near Field Communication) lets people access your content by tapping their phone on an NFC tag. You can write your content URL to NFC tags through the app. It requires a compatible smartphone — check your phone\'s NFC settings.'
    },
    {
      id: 6, category: 'analytics',
      question: 'How do I track views and engagement?',
      answer: 'All content is automatically tracked. Visit Analytics from the sidebar to see views, unique visitors, device types, geographic data, and more. Streams have their own analytics showing which content performs best.'
    },
    {
      id: 7, category: 'account',
      question: 'How do I upgrade my plan?',
      answer: 'Go to Settings → Billing & Account to see your current plan and available upgrades. Plans range from Individual (personal use) to Enterprise (advanced features like white-label, workflows, and multi-brand management).'
    },
    {
      id: 8, category: 'account',
      question: 'Can I invite team members?',
      answer: 'Yes! If you\'re on a Small Business plan or above, go to Settings → Contributors to invite team members via email. You can assign roles and manage permissions for each team member.'
    },
    {
      id: 9, category: 'sharing',
      question: 'Can I password-protect my content?',
      answer: 'Yes! When creating a Stream, you can enable password protection. Viewers will need to enter the password before they can access the content. This is great for private events, exclusive content, or client presentations.'
    },
    {
      id: 10, category: 'getting-started',
      question: 'What\'s the difference between Messages and Streams?',
      answer: 'Messages are individual pieces of content (a single image, video, or text post) with their own link and QR code. Streams are collections of messages grouped together — think of them as playlists or albums for your content.'
    },
  ];

  // Filter FAQs
  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle contact form submit
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.subject.trim() || !contactForm.message.trim()) return;

    setSending(true);
    try {
      await api.post('/api/feedback', {
        type: 'support',
        subject: contactForm.subject,
        message: contactForm.message,
        category: contactForm.category,
        contactEmail: contactForm.email,
        contactName: contactForm.name,
      });
      setSent(true);
      setContactForm(prev => ({ ...prev, subject: '', message: '', category: 'general' }));
      setTimeout(() => setSent(false), 5000);
    } catch (error) {
      console.error('Failed to send:', error);
      // Fallback: open mailto
      const mailtoLink = `mailto:business.shakeelahmed@gmail.com?subject=${encodeURIComponent(contactForm.subject)}&body=${encodeURIComponent(`Name: ${contactForm.name}\nEmail: ${contactForm.email}\nCategory: ${contactForm.category}\n\n${contactForm.message}`)}`;
      window.open(mailtoLink, '_blank');
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
          <p className="text-gray-600">Get help with using Outbound Impact</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 max-w-md">
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'guide'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen size={16} />
            User Guide
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'contact'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail size={16} />
            Contact Us
          </button>
        </div>

        {/* ═══════════════════════════════════
            USER GUIDE TAB
           ═══════════════════════════════════ */}
        {activeTab === 'guide' && (
          <div>
            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText size={24} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h3>
                <p className="text-gray-600 mb-4">Learn how to use all features of Outbound Impact</p>
                <button
                  onClick={() => setActiveCategory('all')}
                  className="text-primary hover:text-secondary font-medium text-sm"
                >
                  Browse FAQ below →
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Mail size={24} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Support</h3>
                <p className="text-gray-600 mb-4">Get help directly from our team</p>
                <button
                  onClick={() => setActiveTab('contact')}
                  className="text-primary hover:text-secondary font-medium text-sm"
                >
                  Contact Us →
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap mb-6">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-purple-100 text-primary'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <cat.icon size={14} />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* FAQ List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h3>
                <p className="text-sm text-gray-500 mt-1">{filteredFaqs.length} topics found</p>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredFaqs.map((faq) => (
                  <div key={faq.id}>
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                      <ChevronDown
                        size={18}
                        className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                          expandedFaq === faq.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {expandedFaq === faq.id && (
                      <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-l-4 border-primary ml-5 pl-4">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
                {filteredFaqs.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <HelpCircle size={40} className="mx-auto mb-3 text-gray-300" />
                    <p>No topics match your search. Try different keywords or <button onClick={() => setActiveTab('contact')} className="text-primary font-medium">contact us</button>.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
            CONTACT US TAB - Direct Email Form
           ═══════════════════════════════════ */}
        {activeTab === 'contact' && (
          <div>
            {/* Contact Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Mail size={20} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Email</p>
                <p className="text-xs text-gray-500 mt-1">support@outboundimpact.org</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Clock size={20} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Response Time</p>
                <p className="text-xs text-gray-500 mt-1">Within 24 hours</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Globe size={20} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Hours</p>
                <p className="text-xs text-gray-500 mt-1">Mon–Fri, 9am–6pm EST</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 lg:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Send us a message</h3>
              <p className="text-gray-600 text-sm mb-6">We'll get back to you as soon as possible.</p>

              {sent && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">Message sent successfully!</p>
                    <p className="text-sm text-green-600">We'll get back to you within 24 hours.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                    <select
                      value={contactForm.category}
                      onChange={(e) => setContactForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm bg-white"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Issue</option>
                      <option value="billing">Billing & Account</option>
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                      <option value="enterprise">Enterprise Inquiry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                    <input
                      type="text"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm"
                      placeholder="How can we help?"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm resize-none"
                    placeholder="Describe your issue or question in detail..."
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-400">
                    Your message will be sent to our support team
                  </p>
                  <button
                    type="submit"
                    disabled={sending || !contactForm.subject.trim() || !contactForm.message.trim()}
                    className="gradient-btn text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SupportPage;
