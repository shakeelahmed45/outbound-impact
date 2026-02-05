import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, BookOpen, Upload, QrCode, Share2, BarChart, 
  Users, Settings, HelpCircle, ArrowLeft, Zap, Shield, MessageCircle
} from 'lucide-react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import BottomNav from '../components/dashboard/BottomNav';
import GuideSection from '../components/guide/GuideSection';

const UserGuidePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Guide categories
  const categories = [
    { id: 'all', label: 'All Topics', icon: BookOpen },
    { id: 'getting-started', label: 'Getting Started', icon: Zap },
    { id: 'streams', label: 'Streams', icon: QrCode },
    { id: 'uploads', label: 'Uploads', icon: Upload },
    { id: 'sharing', label: 'Sharing', icon: Share2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'account', label: 'Account', icon: Settings },
  ];

  const handleSearch = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <DashboardHeader />
      
      <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary hover:text-secondary transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back</span>
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="text-primary" size={40} />
            <h1 className="text-4xl font-bold text-primary">User Guide</h1>
          </div>
          <p className="text-lg text-secondary max-w-2xl mx-auto">
            Everything you need to know about Outbound Impact
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-all text-gray-700"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeCategory === category.id
                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon size={18} />
                {category.label}
              </button>
            );
          })}
        </div>

        {/* Guide Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          {/* Getting Started */}
          {(activeCategory === 'all' || activeCategory === 'getting-started') && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                <Zap size={24} />
                Getting Started
              </h2>

              <GuideSection title="Welcome to Outbound Impact" defaultOpen={true}>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>
                    <strong className="text-primary">Outbound Impact</strong> is a comprehensive media sharing platform that enables you to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Upload and organize your media content (images, videos, audio, text, embeds)</li>
                    <li>Create streams to group related content</li>
                    <li>Generate QR codes and NFC tags for easy sharing</li>
                    <li>Track views and engagement with detailed analytics</li>
                    <li>Collaborate with team members</li>
                    <li>Get instant AI-powered support via Live Chat</li>
                  </ul>
                  <p className="mt-4">
                    This platform is perfect for businesses, organizations, and individuals who want to share content efficiently and track its performance.
                  </p>
                </div>
              </GuideSection>

              <GuideSection title="Your Dashboard Overview">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>Your dashboard is your command center. Here's what each section does:</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">📊 Total Items</h4>
                      <p className="text-sm">Shows all media files you've uploaded</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">📁 Streams</h4>
                      <p className="text-sm">Number of streams you've created</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">👁️ Total Views</h4>
                      <p className="text-sm">Total views across all your content</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">💾 Storage Used</h4>
                      <p className="text-sm">How much storage you're using</p>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Navigation Menu">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>Use the bottom navigation menu to access different sections:</p>
                  
                  <ul className="space-y-3 ml-4">
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">🏠</span>
                      <div>
                        <strong className="text-primary">Dashboard:</strong> Your main overview page
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📤</span>
                      <div>
                        <strong className="text-primary">Upload:</strong> Upload new media files or create content
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📁</span>
                      <div>
                        <strong className="text-primary">Streams:</strong> View and manage your content streams
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📊</span>
                      <div>
                        <strong className="text-primary">Analytics:</strong> View detailed engagement metrics
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">⚙️</span>
                      <div>
                        <strong className="text-primary">Settings:</strong> Manage your account and preferences
                      </div>
                    </li>
                  </ul>
                </div>
              </GuideSection>

              <GuideSection title="Live Chat Support">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Get instant AI-powered help!</strong></p>
                  
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <MessageCircle className="text-blue-600" size={24} />
                      <h4 className="font-semibold text-blue-700">Free Groq AI Assistant</h4>
                    </div>
                    <p className="text-sm text-gray-700">
                      Our AI-powered live chat is available 24/7 to answer your questions, help troubleshoot issues, and guide you through features.
                    </p>
                  </div>

                  <p className="mt-4"><strong>How to use:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Look for the Live Chat icon in your dashboard</li>
                    <li>Click to open the chat window</li>
                    <li>Type your question or issue</li>
                    <li>Get instant AI-powered responses</li>
                  </ol>
                </div>
              </GuideSection>
            </div>
          )}

          {/* Streams */}
          {(activeCategory === 'all' || activeCategory === 'streams') && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                <QrCode size={24} />
                Streams
              </h2>

              <GuideSection title="What are Streams?" defaultOpen={true}>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>
                    <strong className="text-primary">Streams</strong> are collections of related media items grouped together under one QR code or NFC tag.
                  </p>
                  
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-lg">
                    <p className="font-medium text-primary mb-2">✨ Key Benefit:</p>
                    <p>Instead of having separate QR codes for each piece of content, a stream gives you ONE QR code that links to ALL items in that stream!</p>
                  </div>

                  <p className="mt-4"><strong>Perfect for:</strong></p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Event promotions (all event materials in one place)</li>
                    <li>Product launches (videos, images, specs together)</li>
                    <li>Marketing campaigns (multiple assets under one link)</li>
                    <li>Educational content (lessons, videos, resources)</li>
                    <li>Restaurant menus (food photos, descriptions, prices)</li>
                    <li>Real estate listings (property photos, videos, documents)</li>
                  </ul>
                </div>
              </GuideSection>

              <GuideSection title="Creating a Stream">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Step-by-step guide:</strong></p>
                  
                  <ol className="space-y-3 ml-4 list-decimal list-inside">
                    <li>
                      <strong>Navigate to Streams:</strong> Click the "Streams" tab in the bottom navigation
                    </li>
                    <li>
                      <strong>Click "Create Stream":</strong> Find the button at the top of the page
                    </li>
                    <li>
                      <strong>Fill in Details:</strong>
                      <ul className="ml-8 mt-2 space-y-1 list-disc list-inside">
                        <li><strong>Stream Name:</strong> Give it a clear, descriptive name</li>
                        <li><strong>Description:</strong> Explain what this stream is about</li>
                        <li><strong>Category:</strong> Choose from 12 categories (Tickets, Restaurant Menus, Products, Events, Marketing, Education, Healthcare, Real Estate, Travel, Entertainment, Business Cards, Other)</li>
                        <li><strong>Password Protection:</strong> Optional password to restrict access</li>
                        <li><strong>Logo:</strong> Upload a custom logo for your stream (optional)</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Click "Create":</strong> Your stream is now created!
                    </li>
                    <li>
                      <strong>QR Code Generated:</strong> A unique QR code is automatically created for your stream
                    </li>
                  </ol>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                    <p className="font-medium text-yellow-800">💡 Pro Tip:</p>
                    <p className="text-yellow-700 mt-1">Create your stream first, then add content to it. This keeps everything organized from the start!</p>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Adding Content to Streams">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Content is assigned during upload:</strong></p>
                  
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">How to Assign Content</h4>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Go to Upload page</li>
                        <li>Select your file or choose content type (Text/Embed)</li>
                        <li>Fill in content details</li>
                        <li>Select your stream from the "Select Stream" dropdown</li>
                        <li>Click "Upload" or "Create" - content is added to stream automatically!</li>
                      </ol>
                    </div>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <p className="font-medium text-blue-800">ℹ️ Important:</p>
                      <p className="text-blue-700 mt-1">You must select a stream during upload. Content cannot be uploaded without being assigned to a stream.</p>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Stream QR Codes & NFC">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">What's the difference?</strong></p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                        <QrCode size={20} />
                        QR Codes
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Visual code that can be scanned with a camera</li>
                        <li>Works from a distance</li>
                        <li>Can be printed on posters, flyers, menus, etc.</li>
                        <li>No special hardware needed</li>
                        <li>Download as high-quality PNG image</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-lg">
                      <h4 className="font-semibold text-secondary mb-2 flex items-center gap-2">
                        <Shield size={20} />
                        NFC Tags
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Tap-to-access technology</li>
                        <li>Requires close contact (tap)</li>
                        <li>Great for products, cards, badges</li>
                        <li>More secure than QR codes</li>
                        <li>Reusable and durable</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                    <p className="font-medium text-blue-800">ℹ️ Good to Know:</p>
                    <p className="text-blue-700 mt-1">Each stream automatically gets BOTH a QR code and NFC capability. You can use whichever works best for your needs!</p>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Password-Protected Streams">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Keep your streams private:</strong></p>
                  
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                    <h4 className="font-semibold text-purple-700 mb-2">🔒 Password Protection</h4>
                    <p className="text-sm text-gray-700">
                      Add a password to your stream to restrict access. Only people with the password can view the content, even if they have the QR code or link.
                    </p>
                  </div>

                  <p className="mt-4"><strong>How to enable:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>When creating or editing a stream</li>
                    <li>Check "Password Protected"</li>
                    <li>Enter a password</li>
                    <li>Save the stream</li>
                  </ol>

                  <p className="mt-4"><strong>Perfect for:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Private events (weddings, company parties)</li>
                    <li>Internal company content</li>
                    <li>Exclusive member-only content</li>
                    <li>Sensitive information</li>
                  </ul>
                </div>
              </GuideSection>

              <GuideSection title="Viewing Stream Performance">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>Track how well your streams are performing:</p>
                  
                  <ul className="space-y-3 ml-4">
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📊</span>
                      <div>
                        <strong className="text-primary">Total Views:</strong> How many times stream has been accessed
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📱</span>
                      <div>
                        <strong className="text-primary">QR vs NFC:</strong> See which method people prefer
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📁</span>
                      <div>
                        <strong className="text-primary">Content Count:</strong> How many items in this stream
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📅</span>
                      <div>
                        <strong className="text-primary">Date Created:</strong> When stream was launched
                      </div>
                    </li>
                  </ul>
                </div>
              </GuideSection>
            </div>
          )}

          {/* Uploads */}
          {(activeCategory === 'all' || activeCategory === 'uploads') && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                <Upload size={24} />
                Uploading Content
              </h2>

              <GuideSection title="Supported Content Types" defaultOpen={true}>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>Outbound Impact supports 5 types of content:</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">📷 Images</h4>
                      <p className="text-sm text-gray-700">JPG, PNG, GIF, WebP</p>
                      <p className="text-xs text-gray-600 mt-1">Perfect for photos, graphics, posters, menus</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-2">🎥 Videos</h4>
                      <p className="text-sm text-gray-700">MP4, MOV, AVI, WebM</p>
                      <p className="text-xs text-gray-600 mt-1">Max 2 minutes - great for demos, tutorials, promotions</p>
                      <p className="text-xs text-red-600 mt-1">⚠️ Maximum 2 minutes duration</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <h4 className="font-semibold text-purple-700 mb-2">🎵 Audio</h4>
                      <p className="text-sm text-gray-700">MP3, WAV, OGG</p>
                      <p className="text-xs text-gray-600 mt-1">Podcasts, music, voice messages, audio guides</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                      <h4 className="font-semibold text-orange-700 mb-2">📄 Text Posts</h4>
                      <p className="text-sm text-gray-700">Plain text content</p>
                      <p className="text-xs text-gray-600 mt-1">Announcements, descriptions, stories, updates</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg">
                      <h4 className="font-semibold text-cyan-700 mb-2">🔗 Embed Links</h4>
                      <p className="text-sm text-gray-700">YouTube, Vimeo, Google Drive, Spotify, etc.</p>
                      <p className="text-xs text-gray-600 mt-1">Embed external content from supported platforms</p>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="How to Upload Files">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Upload process:</strong></p>
                  
                  <ol className="space-y-3 ml-4 list-decimal list-inside">
                    <li>
                      <strong>Click "Upload" tab</strong> in bottom navigation
                    </li>
                    <li>
                      <strong>Choose content type:</strong> Images, Videos, Audio, Text, or Embed Link
                    </li>
                    <li>
                      <strong>Select your file</strong> (or drag & drop)
                    </li>
                    <li>
                      <strong>Fill in details:</strong>
                      <ul className="ml-8 mt-2 space-y-1 list-disc list-inside">
                        <li><strong>Title:</strong> Give your content a name (required)</li>
                        <li><strong>Description:</strong> Add context (optional)</li>
                        <li><strong>Stream:</strong> Select which stream to add to (required)</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Optional features:</strong>
                      <ul className="ml-8 mt-2 space-y-1 list-disc list-inside">
                        <li><strong>Custom Button:</strong> Add a call-to-action button with text and URL</li>
                        <li><strong>Attachments:</strong> Add up to 5 supporting documents (PDF, Word, Excel, etc.)</li>
                        <li><strong>Sharing Control:</strong> Choose who can share this content</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Click "Upload"</strong> and wait for completion
                    </li>
                    <li>
                      <strong>Done!</strong> Your content is now live in the selected stream
                    </li>
                  </ol>

                  <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-4">
                    <p className="font-medium text-green-800">✨ Auto Features:</p>
                    <ul className="text-green-700 mt-1 space-y-1 list-disc list-inside ml-4">
                      <li>Thumbnails are automatically generated for images and videos</li>
                      <li>Files are optimized for fast loading</li>
                      <li>Content is immediately available to view</li>
                      <li>Progress tracking shows upload status</li>
                    </ul>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Creating Text Posts">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Share text-based content:</strong></p>
                  
                  <ol className="space-y-2 ml-4 list-decimal list-inside">
                    <li>Click "Upload" then select "Text"</li>
                    <li>Enter a title</li>
                    <li>Write your content in the text area</li>
                    <li>Select a stream</li>
                    <li>Optionally add custom button, attachments, or sharing controls</li>
                    <li>Click "Create Text Post"</li>
                  </ol>

                  <p className="mt-4"><strong>Perfect for:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Announcements and updates</li>
                    <li>Product descriptions</li>
                    <li>Event details</li>
                    <li>Stories and testimonials</li>
                  </ul>
                </div>
              </GuideSection>

              <GuideSection title="Embedding External Content">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Supported platforms:</strong></p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-2xl mb-1">▶️</p>
                      <p className="text-sm font-semibold">YouTube</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-2xl mb-1">🎬</p>
                      <p className="text-sm font-semibold">Vimeo</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <p className="text-2xl mb-1">🎵</p>
                      <p className="text-sm font-semibold">SoundCloud</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-2xl mb-1">🎧</p>
                      <p className="text-sm font-semibold">Spotify</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg text-center">
                      <p className="text-2xl mb-1">📁</p>
                      <p className="text-sm font-semibold">Google Drive</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-2xl mb-1">📄</p>
                      <p className="text-sm font-semibold">Google Docs</p>
                    </div>
                  </div>

                  <p className="mt-4"><strong>How to embed:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Click "Upload" then select "Embed Link"</li>
                    <li>Paste the URL from YouTube, Vimeo, Google Drive, etc.</li>
                    <li>Platform is auto-detected</li>
                    <li>Enter title and description</li>
                    <li>Select stream and click "Create Embed"</li>
                  </ol>
                </div>
              </GuideSection>

              <GuideSection title="Custom Buttons & Attachments">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Enhance your content:</strong></p>
                  
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                      <h4 className="font-semibold text-purple-700 mb-2">🔗 Custom Button</h4>
                      <p className="text-sm text-gray-700 mb-2">
                        Add a call-to-action button to any content. Perfect for:
                      </p>
                      <ul className="text-sm text-gray-700 list-disc list-inside ml-4">
                        <li>"Visit Website" → Link to your website</li>
                        <li>"Buy Now" → Link to product page</li>
                        <li>"Learn More" → Link to detailed info</li>
                        <li>"Contact Us" → Link to contact form</li>
                      </ul>
                      <p className="text-xs text-gray-600 mt-2">Button text max 50 characters</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-2">📎 Attachments</h4>
                      <p className="text-sm text-gray-700 mb-2">
                        Add supporting documents to any content:
                      </p>
                      <ul className="text-sm text-gray-700 list-disc list-inside ml-4">
                        <li>Up to 5 files per content item</li>
                        <li>Max 10MB per file</li>
                        <li>Supported: PDF, Word, Excel, PowerPoint, Images, Text</li>
                      </ul>
                      <p className="text-xs text-gray-600 mt-2">Perfect for menus, brochures, specifications, forms</p>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Sharing Controls">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Control how your content spreads:</strong></p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg">
                      <h4 className="font-semibold text-indigo-700 mb-2">🔒 Keep within our community</h4>
                      <p className="text-sm text-gray-700">
                        Only people with the link can view. Share button will be hidden. Perfect for internal content or private events.
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">🔁 Allow others to share this</h4>
                      <p className="text-sm text-gray-700">
                        Viewers can share via social media, WhatsApp, email, etc. Perfect for marketing content and public announcements.
                      </p>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Storage Limits & File Sizes">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>Storage limits depend on your subscription tier:</p>
                  
                  <div className="space-y-3 mt-4">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-700">Individual Plan</h4>
                        <p className="text-sm text-gray-600">$85 one-time for 12 months</p>
                      </div>
                      <div className="text-primary font-bold text-xl">250 GB</div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-blue-700">Small Organization</h4>
                        <p className="text-sm text-blue-600">$35/month - Up to 5 team members</p>
                      </div>
                      <div className="text-blue-700 font-bold text-xl">250 GB</div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-purple-700">Medium Organization</h4>
                        <p className="text-sm text-purple-600">$60/month - Up to 20 team members</p>
                      </div>
                      <div className="text-purple-700 font-bold text-xl">500 GB</div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-primary">Enterprise</h4>
                        <p className="text-sm text-secondary">Custom pricing - Unlimited team members</p>
                      </div>
                      <div className="text-primary font-bold text-xl">1.5TB - 10TB</div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                    <p className="font-medium text-yellow-800">💡 Tips:</p>
                    <ul className="text-yellow-700 mt-1 space-y-1 list-disc list-inside ml-4">
                      <li>Videos are limited to 2 minutes maximum duration</li>
                      <li>Use WiFi for large file uploads on mobile devices</li>
                      <li>Compress videos if needed to save storage space</li>
                    </ul>
                  </div>
                </div>
              </GuideSection>
            </div>
          )}

          {/* Sharing */}
          {(activeCategory === 'all' || activeCategory === 'sharing') && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                <Share2 size={24} />
                Sharing Your Content
              </h2>

              <GuideSection title="Ways to Share" defaultOpen={true}>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>Multiple ways to share your streams and content:</p>
                  
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">📱 QR Code</h4>
                      <p className="text-sm">Download and print your stream QR code. People can scan it with their phone camera to view all content in that stream.</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-secondary/10 to-primary/10 rounded-lg">
                      <h4 className="font-semibold text-secondary mb-2">📲 NFC Tag</h4>
                      <p className="text-sm">Write your stream to an NFC tag or sticker. Users can tap their phone to instantly access all content.</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-2">🔗 Direct Link</h4>
                      <p className="text-sm">Copy the stream URL and share it anywhere - email, social media, text messages, WhatsApp, etc.</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">🔒 Password-Protected Access</h4>
                      <p className="text-sm">Add a password to your stream for restricted access. Share the password only with authorized viewers.</p>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Downloading QR Codes">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">How to download your QR code:</strong></p>
                  
                  <ol className="space-y-2 ml-4 list-decimal list-inside">
                    <li>Go to Streams page</li>
                    <li>Find your stream</li>
                    <li>Click "View QR Code"</li>
                    <li>Click "Download QR Code" button</li>
                    <li>QR code is saved as high-quality PNG image</li>
                  </ol>

                  <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mt-4">
                    <p className="font-medium text-purple-800">💡 Usage Ideas:</p>
                    <ul className="text-purple-700 mt-1 space-y-1 list-disc list-inside ml-4">
                      <li>Print on business cards</li>
                      <li>Add to posters and flyers</li>
                      <li>Include in presentations</li>
                      <li>Display at events and venues</li>
                      <li>Add to product packaging</li>
                      <li>Place on restaurant tables</li>
                      <li>Add to property listings</li>
                    </ul>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Setting Up NFC">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">What you need:</strong></p>
                  
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>NFC-enabled smartphone (most modern phones have this)</li>
                    <li>Blank NFC tags or stickers (available online, very affordable)</li>
                    <li>Your stream URL from Outbound Impact</li>
                  </ul>

                  <p className="mt-4"><strong>How to write to NFC tag:</strong></p>
                  <ol className="space-y-2 ml-4 list-decimal list-inside">
                    <li>Go to your stream page</li>
                    <li>Click "Write to NFC" button</li>
                    <li>Follow the on-screen instructions</li>
                    <li>Hold your phone near the NFC tag</li>
                    <li>Done! Tag is now programmed</li>
                  </ol>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                    <p className="font-medium text-blue-800">ℹ️ Note:</p>
                    <p className="text-blue-700 mt-1">NFC writing requires a compatible smartphone. Not all devices support NFC writing - check your phone's specifications.</p>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Viewer Sharing Controls">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Control if viewers can share your content:</strong></p>
                  
                  <p className="mt-4">When uploading content, you can choose:</p>
                  
                  <div className="space-y-3 mt-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-700 mb-2">🔒 Keep within our community</h4>
                      <ul className="text-sm text-gray-700 list-disc list-inside ml-4">
                        <li>Share button is hidden from viewers</li>
                        <li>Only people with direct link can access</li>
                        <li>Perfect for private or internal content</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-700 mb-2">🔁 Allow others to share this</h4>
                      <ul className="text-sm text-gray-700 list-disc list-inside ml-4">
                        <li>Viewers see share buttons</li>
                        <li>Can share via WhatsApp, social media, email</li>
                        <li>Perfect for marketing and public content</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </GuideSection>
            </div>
          )}

          {/* Analytics */}
          {(activeCategory === 'all' || activeCategory === 'analytics') && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                <BarChart size={24} />
                Analytics & Tracking
              </h2>

              <GuideSection title="Understanding Your Analytics" defaultOpen={true}>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>Track how your content performs with detailed analytics:</p>
                  
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">👁️ Total Views</h4>
                      <p className="text-sm">Total number of times your content has been accessed across all methods.</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-2">📱 QR Code Views</h4>
                      <p className="text-sm">How many people scanned your QR code to view content.</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <h4 className="font-semibold text-purple-700 mb-2">📲 NFC Tap Views</h4>
                      <p className="text-sm">Number of times content was accessed by tapping NFC tag.</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                      <h4 className="font-semibold text-orange-700 mb-2">🔗 Direct Link Views</h4>
                      <p className="text-sm">Views from people clicking your direct share link.</p>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Viewing Stream Analytics">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">How to access:</strong></p>
                  
                  <ol className="space-y-2 ml-4 list-decimal list-inside">
                    <li>Go to Analytics page from bottom navigation</li>
                    <li>View overall account statistics</li>
                    <li>See breakdown by stream</li>
                    <li>Check individual item performance</li>
                  </ol>

                  <p className="mt-4"><strong>Key metrics to watch:</strong></p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Engagement rate:</strong> Which streams get the most views</li>
                    <li><strong>Popular content:</strong> Your top-performing items</li>
                    <li><strong>Access method:</strong> Whether people prefer QR or NFC</li>
                    <li><strong>Growth trends:</strong> How views change over time</li>
                  </ul>
                </div>
              </GuideSection>

              <GuideSection title="Advanced Analytics (Enterprise)">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Enterprise plans include:</strong></p>
                  
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Detailed view history with timestamps</li>
                    <li>Geographic location data</li>
                    <li>Device and browser analytics</li>
                    <li>Export reports as CSV/PDF</li>
                    <li>Custom analytics dashboards</li>
                    <li>API access for data integration</li>
                  </ul>
                </div>
              </GuideSection>

              <GuideSection title="Using Analytics to Improve">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Make data-driven decisions:</strong></p>
                  
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-lg mt-4">
                    <ul className="space-y-2 list-disc list-inside">
                      <li><strong>Low views?</strong> Consider better placement of QR codes or more promotion</li>
                      <li><strong>High engagement?</strong> Create more similar content that your audience loves</li>
                      <li><strong>Prefer QR over NFC?</strong> Focus on printable QR codes for your audience</li>
                      <li><strong>One stream outperforming?</strong> Analyze what makes it successful and replicate</li>
                    </ul>
                  </div>
                </div>
              </GuideSection>
            </div>
          )}

          {/* Account Management */}
          {(activeCategory === 'all' || activeCategory === 'account') && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                <Settings size={24} />
                Account Management
              </h2>

              <GuideSection title="Profile Settings" defaultOpen={true}>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Manage your profile:</strong></p>
                  
                  <ul className="space-y-3 ml-4">
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">👤</span>
                      <div>
                        <strong className="text-primary">Profile Picture:</strong> Click your avatar to upload a new picture
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📧</span>
                      <div>
                        <strong className="text-primary">Email:</strong> Your account email (used for login)
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">🔐</span>
                      <div>
                        <strong className="text-primary">Password:</strong> Change your password from Settings page
                      </div>
                    </li>
                  </ul>
                </div>
              </GuideSection>

              <GuideSection title="Subscription Management">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Manage your plan:</strong></p>
                  
                  <div className="space-y-3 mt-4">
                    <p><strong>View Current Plan:</strong> See your subscription details in Settings</p>
                    <p><strong>Upgrade/Downgrade:</strong> Change your plan anytime</p>
                    <p><strong>Billing:</strong> View payment history and update payment method</p>
                    <p><strong>Auto-Renewal:</strong> Toggle automatic renewal on/off</p>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                    <p className="font-medium text-blue-800">ℹ️ Plan Details:</p>
                    <ul className="text-blue-700 mt-1 space-y-1 list-disc list-inside ml-4">
                      <li><strong>Individual:</strong> One-time payment of $85 for 12 months access</li>
                      <li><strong>Organization Plans:</strong> Monthly recurring subscription</li>
                      <li><strong>Enterprise:</strong> Custom pricing with flexible payment terms</li>
                    </ul>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Team Management">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">For Organization plans:</strong></p>
                  
                  <p className="mt-4"><strong>Adding team members:</strong></p>
                  <ol className="space-y-2 ml-4 list-decimal list-inside">
                    <li>Go to Team page</li>
                    <li>Click "Invite Team Member"</li>
                    <li>Enter their email address</li>
                    <li>Assign a role (Admin, Editor, or Viewer)</li>
                    <li>Send invitation</li>
                  </ol>

                  <p className="mt-4"><strong>Team roles:</strong></p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Admin:</strong> Full access - manage team, billing, all content</li>
                    <li><strong>Editor:</strong> Create, edit, and delete content</li>
                    <li><strong>Viewer:</strong> View content and analytics only (read-only)</li>
                  </ul>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                    <p className="font-medium text-yellow-800">⚠️ Team Limits:</p>
                    <ul className="text-yellow-700 mt-1 space-y-1 list-disc list-inside ml-4">
                      <li>Small Organization: Up to 5 team members</li>
                      <li>Medium Organization: Up to 20 team members</li>
                      <li>Enterprise: Unlimited team members</li>
                    </ul>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Security & Privacy">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Keep your account secure:</strong></p>
                  
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                      <h4 className="font-semibold text-red-700 mb-2">🔐 Strong Passwords</h4>
                      <p className="text-sm">Use a unique, strong password with letters, numbers, and symbols. Change it regularly.</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-2">🔒 Two-Factor Auth (Enterprise)</h4>
                      <p className="text-sm">Add an extra layer of security with 2FA (available for Enterprise plans)</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">👀 Privacy Controls</h4>
                      <p className="text-sm">Control who can see and share your content with stream passwords and sharing settings</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <h4 className="font-semibold text-purple-700 mb-2">🛡️ White-Label (Enterprise)</h4>
                      <p className="text-sm">Custom branding and domain for complete brand control</p>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Enterprise Features">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Exclusive Enterprise capabilities:</strong></p>
                  
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>API Access:</strong> Integrate Outbound Impact with your systems</li>
                    <li><strong>White-Label:</strong> Custom branding, colors, and domain</li>
                    <li><strong>Advanced Analytics:</strong> Detailed insights and export reports</li>
                    <li><strong>Dedicated Support:</strong> Priority support with dedicated account manager</li>
                    <li><strong>Custom Storage:</strong> Choose from 1.5TB to 10TB</li>
                    <li><strong>Unlimited Team:</strong> Add as many team members as needed</li>
                    <li><strong>SSO Integration:</strong> Single sign-on for enterprise security</li>
                    <li><strong>Custom Integrations:</strong> Tailored solutions for your needs</li>
                  </ul>
                </div>
              </GuideSection>
            </div>
          )}

          {/* FAQ */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <HelpCircle size={24} />
              Frequently Asked Questions
            </h2>

            <GuideSection title="How do I get started?">
              <p className="text-gray-700">
                Start by creating your first stream, then upload content to it. Generate a QR code, share it, and you're live! Check the "Getting Started" section above for detailed steps.
              </p>
            </GuideSection>

            <GuideSection title="Can I edit content after uploading?">
              <p className="text-gray-700">
                Yes! Content can be edited from the Streams page. Click on your stream, find the content item, and you can update titles, descriptions, and other details.
              </p>
            </GuideSection>

            <GuideSection title="What happens when I reach my storage limit?">
              <p className="text-gray-700">
                You'll receive a notification when approaching your limit. You can either delete old content to free up space or upgrade to a plan with more storage. Your existing content remains accessible until you exceed the limit.
              </p>
            </GuideSection>

            <GuideSection title="Can I download my QR codes?">
              <p className="text-gray-700">
                Absolutely! Each stream has a "Download QR Code" button that saves it as a high-quality PNG image you can print, share, or use in any way you need.
              </p>
            </GuideSection>

            <GuideSection title="Do QR codes expire?">
              <p className="text-gray-700">
                No! Your QR codes remain active as long as your account is active and the stream exists. They never expire.
              </p>
            </GuideSection>

            <GuideSection title="Can I see who viewed my content?">
              <p className="text-gray-700">
                You can see total view counts, access methods (QR/NFC/Direct), and general analytics. For privacy reasons, we don't track personal information of viewers. Enterprise plans get more detailed (but still privacy-respecting) analytics.
              </p>
            </GuideSection>

            <GuideSection title="How long can my videos be?">
              <p className="text-gray-700">
                Videos are limited to 2 minutes maximum duration. This ensures fast loading times and optimal viewer experience. If you need to share longer videos, use the Embed feature to link to YouTube or Vimeo.
              </p>
            </GuideSection>

            <GuideSection title="Can I use one QR code for multiple items?">
              <p className="text-gray-700">
                Yes! That's exactly what streams are for. Create a stream, add multiple items to it, and the stream's single QR code links to all content within it. Perfect for events, product catalogs, menus, and more.
              </p>
            </GuideSection>

            <GuideSection title="Is my content secure?">
              <p className="text-gray-700">
                Yes! All content is stored securely on our CDN with encryption. You can add password protection to streams for extra security. Only people with the link, QR code, or NFC tag (and password if set) can access your content.
              </p>
            </GuideSection>

            <GuideSection title="How do I contact support?">
              <p className="text-gray-700">
                Use the Live Chat feature (AI-powered, available 24/7) for instant help. You can also send feedback through Settings. Enterprise customers have access to dedicated support with priority response times.
              </p>
            </GuideSection>

            <GuideSection title="Can I invite team members?">
              <p className="text-gray-700">
                Yes, if you have an Organization or Enterprise plan! Go to Team page, click "Invite Team Member", enter their email, assign a role (Admin/Editor/Viewer), and send the invitation. Small Org allows up to 5 members, Medium Org up to 20, and Enterprise is unlimited.
              </p>
            </GuideSection>

            <GuideSection title="What's the difference between Individual and Organization plans?">
              <p className="text-gray-700">
                Individual is a one-time payment of $85 for 12 months of personal use (250GB storage). Organization plans are monthly subscriptions with team collaboration features, more storage, and advanced analytics. Small Org ($35/month) supports up to 5 users with 250GB. Medium Org ($60/month) supports up to 20 users with 500GB.
              </p>
            </GuideSection>
          </div>
        </div>

        {/* Need More Help */}
        <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-2xl p-8 text-center">
          <HelpCircle size={48} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Still Need Help?</h2>
          <p className="mb-6 opacity-90">
            Our AI-powered support and dedicated team are here to help you succeed
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
            >
              Send Feedback
            </button>
            <button
              onClick={() => navigate('/live-chat')}
              className="bg-white/20 backdrop-blur text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition-all border-2 border-white flex items-center gap-2"
            >
              <MessageCircle size={20} />
              Live Chat Support (AI)
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default UserGuidePage;
