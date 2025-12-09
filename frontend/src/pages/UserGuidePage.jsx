import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, BookOpen, Upload, QrCode, Share2, BarChart, 
  Users, Settings, HelpCircle, ArrowLeft, Zap, Shield, Camera
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
    { id: 'campaigns', label: 'Campaigns', icon: QrCode },
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
                    <li>Upload and organize your media content (images, videos, audio, text)</li>
                    <li>Create campaigns to group related content</li>
                    <li>Generate QR codes and NFC tags for easy sharing</li>
                    <li>Track views and engagement with detailed analytics</li>
                    <li>Collaborate with team members</li>
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
                      <h4 className="font-semibold text-primary mb-2">📁 Campaigns</h4>
                      <p className="text-sm">Number of campaigns you've created</p>
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
                        <strong className="text-primary">Upload:</strong> Upload new media files
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📁</span>
                      <div>
                        <strong className="text-primary">Items:</strong> View and manage all your media
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
            </div>
          )}

          {/* Campaigns */}
          {(activeCategory === 'all' || activeCategory === 'campaigns') && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                <QrCode size={24} />
                Campaigns
              </h2>

              <GuideSection title="What are Campaigns?" defaultOpen={true}>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>
                    <strong className="text-primary">Campaigns</strong> are collections of related media items grouped together under one QR code or NFC tag.
                  </p>
                  
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-lg">
                    <p className="font-medium text-primary mb-2">✨ Key Benefit:</p>
                    <p>Instead of having separate QR codes for each piece of content, a campaign gives you ONE QR code that links to ALL items in that campaign!</p>
                  </div>

                  <p className="mt-4"><strong>Perfect for:</strong></p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Event promotions (all event materials in one place)</li>
                    <li>Product launches (videos, images, specs together)</li>
                    <li>Marketing campaigns (multiple assets under one link)</li>
                    <li>Educational content (lessons, videos, resources)</li>
                  </ul>
                </div>
              </GuideSection>

              <GuideSection title="Creating a Campaign">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Step-by-step guide:</strong></p>
                  
                  <ol className="space-y-3 ml-4 list-decimal list-inside">
                    <li>
                      <strong>Navigate to Campaigns:</strong> Click the "Campaigns" tab in the bottom navigation
                    </li>
                    <li>
                      <strong>Click "Create Campaign":</strong> Find the button at the top of the page
                    </li>
                    <li>
                      <strong>Fill in Details:</strong>
                      <ul className="ml-8 mt-2 space-y-1 list-disc list-inside">
                        <li><strong>Campaign Name:</strong> Give it a clear, descriptive name</li>
                        <li><strong>Description:</strong> Explain what this campaign is about</li>
                        <li><strong>Category:</strong> Choose a category (optional but helpful for organization)</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Click "Create":</strong> Your campaign is now created!
                    </li>
                    <li>
                      <strong>QR Code Generated:</strong> A unique QR code is automatically created for your campaign
                    </li>
                  </ol>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                    <p className="font-medium text-yellow-800">💡 Pro Tip:</p>
                    <p className="text-yellow-700 mt-1">Create your campaign first, then add content to it. This keeps everything organized from the start!</p>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Adding Content to Campaigns">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Two ways to add content:</strong></p>
                  
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">Method 1: During Upload</h4>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Go to Upload page</li>
                        <li>Select your file</li>
                        <li>In the upload form, choose "Assign to Campaign"</li>
                        <li>Select your campaign from the dropdown</li>
                        <li>Click "Upload" - content is added to campaign automatically!</li>
                      </ol>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">Method 2: From Items Page</h4>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Go to Items page</li>
                        <li>Find the content you want to add</li>
                        <li>Click on the item to view details</li>
                        <li>Click "Assign to Campaign"</li>
                        <li>Choose your campaign - done!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Campaign QR Codes & NFC">
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
                        <li>Can be printed on posters, flyers, etc.</li>
                        <li>No special hardware needed</li>
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
                      </ul>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                    <p className="font-medium text-blue-800">ℹ️ Good to Know:</p>
                    <p className="text-blue-700 mt-1">Each campaign automatically gets BOTH a QR code and NFC capability. You can use whichever works best for your needs!</p>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Viewing Campaign Performance">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>Track how well your campaigns are performing:</p>
                  
                  <ul className="space-y-3 ml-4">
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📊</span>
                      <div>
                        <strong className="text-primary">Total Views:</strong> How many times campaign has been accessed
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
                        <strong className="text-primary">Content Count:</strong> How many items in this campaign
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-2xl">📅</span>
                      <div>
                        <strong className="text-primary">Date Created:</strong> When campaign was launched
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

              <GuideSection title="Supported File Types" defaultOpen={true}>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>Outbound Impact supports various file types:</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">📷 Images</h4>
                      <p className="text-sm text-gray-700">JPG, PNG, GIF, WebP</p>
                      <p className="text-xs text-gray-600 mt-1">Perfect for photos, graphics, posters</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-2">🎥 Videos</h4>
                      <p className="text-sm text-gray-700">MP4, MOV, AVI, WebM</p>
                      <p className="text-xs text-gray-600 mt-1">Great for demos, tutorials, promotions</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <h4 className="font-semibold text-purple-700 mb-2">🎵 Audio</h4>
                      <p className="text-sm text-gray-700">MP3, WAV, OGG</p>
                      <p className="text-xs text-gray-600 mt-1">Podcasts, music, voice messages</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                      <h4 className="font-semibold text-orange-700 mb-2">📄 Documents</h4>
                      <p className="text-sm text-gray-700">PDF, TXT, DOC</p>
                      <p className="text-xs text-gray-600 mt-1">Guides, manuals, resources</p>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="How to Upload">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Upload process:</strong></p>
                  
                  <ol className="space-y-3 ml-4 list-decimal list-inside">
                    <li>
                      <strong>Click "Upload" tab</strong> in bottom navigation
                    </li>
                    <li>
                      <strong>Choose your file:</strong>
                      <ul className="ml-8 mt-2 space-y-1 list-disc list-inside">
                        <li>Click "Choose File" or drag & drop</li>
                        <li>Select file from your device</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Fill in details:</strong>
                      <ul className="ml-8 mt-2 space-y-1 list-disc list-inside">
                        <li><strong>Title:</strong> Give your content a name</li>
                        <li><strong>Description:</strong> Add context (optional)</li>
                        <li><strong>Campaign:</strong> Assign to a campaign (optional)</li>
                        <li><strong>Thumbnail:</strong> Upload custom thumbnail (optional)</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Click "Upload"</strong> and wait for completion
                    </li>
                    <li>
                      <strong>Done!</strong> Your content is now live and ready to share
                    </li>
                  </ol>

                  <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-4">
                    <p className="font-medium text-green-800">✨ Auto Features:</p>
                    <ul className="text-green-700 mt-1 space-y-1 list-disc list-inside ml-4">
                      <li>Thumbnails are automatically generated for images</li>
                      <li>Files are optimized for fast loading</li>
                      <li>Content is immediately available to view</li>
                    </ul>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="File Size Limits">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>Storage limits depend on your subscription tier:</p>
                  
                  <div className="space-y-3 mt-4">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-700">Individual Plan</h4>
                        <p className="text-sm text-gray-600">Perfect for personal use</p>
                      </div>
                      <div className="text-primary font-bold text-xl">2 GB</div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-blue-700">Small Organization</h4>
                        <p className="text-sm text-blue-600">For small teams</p>
                      </div>
                      <div className="text-blue-700 font-bold text-xl">10 GB</div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-purple-700">Medium Organization</h4>
                        <p className="text-sm text-purple-600">Growing businesses</p>
                      </div>
                      <div className="text-purple-700 font-bold text-xl">50 GB</div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-primary">Enterprise</h4>
                        <p className="text-sm text-secondary">Unlimited power</p>
                      </div>
                      <div className="text-primary font-bold text-xl">Unlimited</div>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Managing Thumbnails">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Thumbnails make your content visually appealing!</strong></p>
                  
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">🤖 Automatic Thumbnails</h4>
                      <p className="text-sm">For images, thumbnails are automatically created when you upload. No extra work needed!</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">📷 Custom Thumbnails</h4>
                      <p className="text-sm">For videos and other files, you can upload a custom thumbnail to represent your content better.</p>
                    </div>
                  </div>

                  <p className="mt-4"><strong>To add/change a thumbnail:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Go to Items page</li>
                    <li>Find your content</li>
                    <li>Click "Upload Thumbnail" or "Change Thumbnail"</li>
                    <li>Select an image file</li>
                    <li>Done! Your new thumbnail is live</li>
                  </ol>
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
                  <p>Multiple ways to share your campaigns and content:</p>
                  
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
                      <h4 className="font-semibold text-primary mb-2">📱 QR Code</h4>
                      <p className="text-sm">Download and print your campaign QR code. People can scan it with their phone camera to view your content.</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-secondary/10 to-primary/10 rounded-lg">
                      <h4 className="font-semibold text-secondary mb-2">📲 NFC Tag</h4>
                      <p className="text-sm">Write your campaign to an NFC tag or sticker. Users can tap their phone to instantly access your content.</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-2">🔗 Direct Link</h4>
                      <p className="text-sm">Copy the campaign URL and share it anywhere - email, social media, text messages, etc.</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">✉️ Email</h4>
                      <p className="text-sm">Send the campaign directly to someone's email with a pre-written message.</p>
                    </div>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Downloading QR Codes">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">How to download your QR code:</strong></p>
                  
                  <ol className="space-y-2 ml-4 list-decimal list-inside">
                    <li>Go to Campaigns page</li>
                    <li>Find your campaign</li>
                    <li>Click "View QR Code"</li>
                    <li>Click "Download QR Code" button</li>
                    <li>QR code is saved as PNG image</li>
                  </ol>

                  <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mt-4">
                    <p className="font-medium text-purple-800">💡 Usage Ideas:</p>
                    <ul className="text-purple-700 mt-1 space-y-1 list-disc list-inside ml-4">
                      <li>Print on business cards</li>
                      <li>Add to posters and flyers</li>
                      <li>Include in presentations</li>
                      <li>Display at events</li>
                      <li>Add to product packaging</li>
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
                    <li>Your campaign URL from Outbound Impact</li>
                  </ul>

                  <p className="mt-4"><strong>How to write to NFC tag:</strong></p>
                  <ol className="space-y-2 ml-4 list-decimal list-inside">
                    <li>Go to your campaign page</li>
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

              <GuideSection title="Viewing Campaign Analytics">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">How to access:</strong></p>
                  
                  <ol className="space-y-2 ml-4 list-decimal list-inside">
                    <li>Go to Analytics page from bottom navigation</li>
                    <li>View overall account statistics</li>
                    <li>See breakdown by campaign</li>
                    <li>Check individual item performance</li>
                  </ol>

                  <p className="mt-4"><strong>Key metrics to watch:</strong></p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Engagement rate:</strong> Which campaigns get the most views</li>
                    <li><strong>Popular content:</strong> Your top-performing items</li>
                    <li><strong>Access method:</strong> Whether people prefer QR or NFC</li>
                    <li><strong>Growth trends:</strong> How views change over time</li>
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
                      <li><strong>One campaign outperforming?</strong> Analyze what makes it successful</li>
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
                        <strong className="text-primary">Email:</strong> Your account email (can't be changed)
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
                    <p><strong>Upgrade:</strong> Need more storage or features? Upgrade anytime</p>
                    <p><strong>Billing:</strong> View payment history and update payment method</p>
                    <p><strong>Cancel:</strong> Cancel subscription (data remains for 30 days)</p>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                    <p className="font-medium text-yellow-800">⚠️ Before Canceling:</p>
                    <p className="text-yellow-700 mt-1">Make sure to download any important content. After 30 days, data may be permanently deleted.</p>
                  </div>
                </div>
              </GuideSection>

              <GuideSection title="Team Management">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">For Organization plans:</strong></p>
                  
                  <p className="mt-4"><strong>Adding team members:</strong></p>
                  <ol className="space-y-2 ml-4 list-decimal list-inside">
                    <li>Go to Team page</li>
                    <li>Click "Add Team Member"</li>
                    <li>Enter their email</li>
                    <li>Assign a role</li>
                    <li>Send invitation</li>
                  </ol>

                  <p className="mt-4"><strong>Team roles:</strong></p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Admin:</strong> Full access to everything</li>
                    <li><strong>Editor:</strong> Can create and edit content</li>
                    <li><strong>Viewer:</strong> Can only view content</li>
                  </ul>
                </div>
              </GuideSection>

              <GuideSection title="Security & Privacy">
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p><strong className="text-primary">Keep your account secure:</strong></p>
                  
                  <div className="space-y-4 mt-4">
                    <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                      <h4 className="font-semibold text-red-700 mb-2">🔐 Strong Passwords</h4>
                      <p className="text-sm">Use a unique, strong password with letters, numbers, and symbols</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-2">🔒 Two-Factor Auth (Enterprise)</h4>
                      <p className="text-sm">Add an extra layer of security with 2FA (available for Enterprise plans)</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">👀 Privacy Controls</h4>
                      <p className="text-sm">Control who can see your content with campaign privacy settings</p>
                    </div>
                  </div>
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
                Start by creating your first campaign, then upload content to it. Generate a QR code, share it, and you're live! Check the "Getting Started" section above for detailed steps.
              </p>
            </GuideSection>

            <GuideSection title="Can I edit content after uploading?">
              <p className="text-gray-700">
                Yes! Go to Items page, click on any item, and you can edit the title, description, thumbnail, or reassign it to a different campaign.
              </p>
            </GuideSection>

            <GuideSection title="What happens when I reach my storage limit?">
              <p className="text-gray-700">
                You'll receive a notification. You can either delete old content or upgrade to a plan with more storage. Your existing content remains accessible.
              </p>
            </GuideSection>

            <GuideSection title="Can I download my QR codes?">
              <p className="text-gray-700">
                Absolutely! Each campaign has a "Download QR Code" button that saves it as a high-quality PNG image you can print or share.
              </p>
            </GuideSection>

            <GuideSection title="Do QR codes expire?">
              <p className="text-gray-700">
                No! Your QR codes remain active as long as your account is active and the campaign exists.
              </p>
            </GuideSection>

            <GuideSection title="Can I see who viewed my content?">
              <p className="text-gray-700">
                You can see total view counts, access methods (QR/NFC/Direct), and general analytics. We don't track personal information of viewers to respect their privacy.
              </p>
            </GuideSection>

            <GuideSection title="How do I cancel my subscription?">
              <p className="text-gray-700">
                Go to Settings → Subscription → Cancel. Your data is safe for 30 days after cancellation. You can reactivate anytime during this period.
              </p>
            </GuideSection>

            <GuideSection title="Can I use one QR code for multiple items?">
              <p className="text-gray-700">
                Yes! That's what campaigns are for. Create a campaign, add multiple items to it, and use the campaign's single QR code to link to all content.
              </p>
            </GuideSection>

            <GuideSection title="Is my content secure?">
              <p className="text-gray-700">
                Yes! All content is stored securely on our CDN with encryption. Only people with the link, QR code, or NFC tag can access your content (unless you make it public).
              </p>
            </GuideSection>

            <GuideSection title="How do I contact support?">
              <p className="text-gray-700">
                Go to Settings → Feedback or use the Live Chat feature for real-time support. Our team typically responds within 24 hours.
              </p>
            </GuideSection>
          </div>
        </div>

        {/* Need More Help */}
        <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-2xl p-8 text-center">
          <HelpCircle size={48} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Still Need Help?</h2>
          <p className="mb-6 opacity-90">
            Our support team is here to help you succeed
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
              className="bg-white/20 backdrop-blur text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition-all border-2 border-white"
            >
              Live Chat Support
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default UserGuidePage;