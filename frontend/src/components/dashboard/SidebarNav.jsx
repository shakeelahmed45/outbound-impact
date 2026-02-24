import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Upload, FolderOpen, QrCode, Rocket, BarChart3,
  Users, Settings, HelpCircle, LogOut, ChevronDown,
  Shield, X, Activity, MessageSquare,
  CreditCard, UserCircle, Building2, GitBranch,
  ClipboardCheck, FileCheck, Menu
} from 'lucide-react';
import useAuthStore, { hasFeature } from '../../store/authStore';
import api from '../../services/api';

const SidebarNav = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [contentExpanded, setContentExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [enterpriseExpanded, setEnterpriseExpanded] = useState(false);

  // ✅ NEW: Org scope state for banner
  const [orgInfo, setOrgInfo] = useState(null);

  // Auto-expand sections based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/upload') || path.includes('/items') || path.includes('/campaigns')) {
      setContentExpanded(true);
    }
    if (path.includes('/settings') || path.includes('/team') || path.includes('/security') || path.includes('/profile')) {
      setSettingsExpanded(true);
    }
    if (path.includes('/cohorts') || path.includes('/workflows') || path.includes('/organizations') || path.includes('/audit') || path.includes('/compliance')) {
      setEnterpriseExpanded(true);
    }
  }, [location.pathname]);

  // ✅ NEW: Fetch org scope for banner
  useEffect(() => {
    const fetchOrgScope = async () => {
      try {
        const res = await api.get('/user/org-scope', { skipCache: true });
        if (res.data?.status === 'success' && res.data.isTeamMember && res.data.orgNames?.length > 0) {
          setOrgInfo({
            names: res.data.orgNames,
            role: res.data.teamRole,
          });
        }
      } catch (err) {
        // Silently fail — banner just won't show
      }
    };
    if (user?.isTeamMember) {
      fetchOrgScope();
    }
  }, [user?.isTeamMember]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const handleNavigate = (path) => {
    navigate(path);
    closeMobileMenu();
  };

  const isActive = (path) => location.pathname === path;

  // Role checks — use org owner's role for team members
  const effectiveRole = user?.isTeamMember ? user?.organization?.role : user?.role;
  const isIndividual = effectiveRole === 'INDIVIDUAL';
  const isSmall = effectiveRole === 'ORG_SMALL';
  const isMedium = effectiveRole === 'ORG_MEDIUM';
  const isEnterprise = effectiveRole === 'ORG_ENTERPRISE';
  const isSmallOrAbove = isSmall || isMedium || isEnterprise;
  const isMediumOrAbove = isMedium || isEnterprise;
  const isTeamViewer = user?.isTeamMember && user?.teamRole === 'VIEWER';
  const isTeamEditor = user?.isTeamMember && user?.teamRole === 'EDITOR';

  // ✅ NEW: VIEWER + EDITOR cannot access billing or manage team
  const canAccessBilling = !user?.isTeamMember || user?.teamRole === 'ADMIN';
  const canAccessContributors = !user?.isTeamMember || user?.teamRole === 'ADMIN';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Calculate storage percentage — use org's storage for team members
  const effectiveStorage = user?.isTeamMember ? user?.organization : user;
  const storageUsed = Number(effectiveStorage?.storageUsed || 0);
  const storageLimit = Number(effectiveStorage?.storageLimit || 2147483648);
  const storagePercent = storageLimit > 0 ? Math.min(Math.round((storageUsed / storageLimit) * 100), 100) : 0;

  const formatStorage = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(0)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  const getPlanLabel = () => {
    switch (effectiveRole) {
      case 'INDIVIDUAL': return 'Personal';
      case 'ORG_SMALL': return 'Small Business';
      case 'ORG_MEDIUM': return 'Medium Business';
      case 'ORG_ENTERPRISE': return 'Enterprise';
      default: return 'Dashboard';
    }
  };

  // ✅ NEW: Role badge text
  const getRoleBadge = () => {
    if (!user?.isTeamMember) return null;
    const roleLabels = { VIEWER: 'Viewer', EDITOR: 'Editor', ADMIN: 'Admin' };
    return roleLabels[user?.teamRole] || user?.teamRole;
  };

  // Shared sidebar content for desktop and mobile
  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo / Brand Header */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-btn rounded-lg flex items-center justify-center shadow-md">
              <Home size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Outbound Impact</p>
              <p className="text-xs text-gray-500">{getPlanLabel()}</p>
            </div>
          </div>
          {isMobile && (
            <button onClick={closeMobileMenu} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* ✅ NEW: Organization Scope Banner */}
      {orgInfo && (
        <div className="mx-3 mt-3 px-3 py-2.5 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-purple-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-purple-800 truncate">
                {orgInfo.names.join(' • ')}
              </p>
              <p className="text-xs text-purple-600">
                {getRoleBadge()} • Scoped access
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 p-3 overflow-y-auto">

        {/* ═══════════════════════════════════
            DASHBOARD (All tiers)
           ═══════════════════════════════════ */}
        <NavItem
          icon={Home}
          label="Dashboard"
          active={isActive('/dashboard')}
          onClick={() => handleNavigate('/dashboard')}
        />

        {/* ═══════════════════════════════════
            CONTENT Section (Collapsible)
           ═══════════════════════════════════ */}
        <div className="mt-1">
          <CollapsibleSection
            icon={FolderOpen}
            label="Content"
            expanded={contentExpanded}
            onToggle={() => setContentExpanded(!contentExpanded)}
          >
            {/* Upload - All tiers (hidden for VIEWER, feature-gated for EDITOR) */}
            {!isTeamViewer && hasFeature('uploads') && (
              <SubNavItem
                icon={Upload}
                label="Upload"
                active={isActive('/dashboard/upload')}
                onClick={() => handleNavigate('/dashboard/upload')}
              />
            )}
            {/* Messages (Items) - All tiers, feature-gated */}
            {hasFeature('items') && (
            <SubNavItem
              icon={QrCode}
              label="My Items"
              active={isActive('/dashboard/items')}
              onClick={() => handleNavigate('/dashboard/items')}
            />
            )}
            {/* Streams (Campaigns) - All tiers, feature-gated */}
            {(isIndividual || isSmallOrAbove) && hasFeature('streams') && (
              <SubNavItem
                icon={Rocket}
                label="Streams"
                active={isActive('/dashboard/campaigns')}
                onClick={() => handleNavigate('/dashboard/campaigns')}
              />
            )}
          </CollapsibleSection>
        </div>

        {/* ═══════════════════════════════════
            ANALYTICS
            Individual = basic, Medium/Enterprise = advanced
            Small = hidden (no analytics page)
           ═══════════════════════════════════ */}
        {isIndividual && hasFeature('analytics') && (
          <NavItem
            icon={BarChart3}
            label="Analytics"
            active={isActive('/dashboard/analytics')}
            onClick={() => handleNavigate('/dashboard/analytics')}
          />
        )}
        {/* Contributors - Individual (flat nav below Analytics) */}
        {isIndividual && (
          <NavItem
            icon={Users}
            label="Contributors"
            active={isActive('/dashboard/team')}
            onClick={() => handleNavigate('/dashboard/team')}
          />
        )}
        {isMediumOrAbove && hasFeature('analytics') && (
          <NavItem
            icon={BarChart3}
            label="Analytics"
            active={isActive('/dashboard/advanced-analytics')}
            onClick={() => handleNavigate('/dashboard/advanced-analytics')}
          />
        )}

        {/* ═══════════════════════════════════
            ALL ACTIVITY - Small, Medium, Enterprise
           ═══════════════════════════════════ */}
        {isSmallOrAbove && hasFeature('activity') && (
          <NavItem
            icon={Activity}
            label="All Activity"
            active={isActive('/dashboard/activity')}
            onClick={() => handleNavigate('/dashboard/activity')}
          />
        )}

        {/* ═══════════════════════════════════
            INBOX (Messages) - Small, Medium, Enterprise
            Internal team + External email messaging
           ═══════════════════════════════════ */}
        {isSmallOrAbove && hasFeature('messages') && (
          <NavItem
            icon={MessageSquare}
            label="Messages"
            active={isActive('/dashboard/inbox')}
            onClick={() => handleNavigate('/dashboard/inbox')}
          />
        )}

        {/* ═══════════════════════════════════
            ENTERPRISE Section (Collapsible)
            Only for Enterprise users
           ═══════════════════════════════════ */}
        {isEnterprise && (
          <div className="mt-1">
            <CollapsibleSection
              icon={Shield}
              label="Enterprise"
              expanded={enterpriseExpanded}
              onToggle={() => setEnterpriseExpanded(!enterpriseExpanded)}
              badge="PRO"
            >
              {hasFeature('cohorts') && (
              <SubNavItem
                icon={Users}
                label="Cohorts"
                active={isActive('/dashboard/cohorts')}
                onClick={() => handleNavigate('/dashboard/cohorts')}
              />
              )}
              {hasFeature('workflows') && (
              <SubNavItem
                icon={GitBranch}
                label="Workflows"
                active={isActive('/dashboard/workflows')}
                onClick={() => handleNavigate('/dashboard/workflows')}
              />
              )}
              {/* ✅ Organizations — hidden for VIEWER+EDITOR (they can't manage orgs), feature-gated */}
              {canAccessContributors && hasFeature('organizations') && (
                <SubNavItem
                  icon={Building2}
                  label="Organizations"
                  active={isActive('/dashboard/organizations')}
                  onClick={() => handleNavigate('/dashboard/organizations')}
                />
              )}
              {hasFeature('audit') && (
              <SubNavItem
                icon={ClipboardCheck}
                label="Audit Log"
                active={isActive('/dashboard/audit')}
                onClick={() => handleNavigate('/dashboard/audit')}
              />
              )}
              {hasFeature('compliance') && (
              <SubNavItem
                icon={FileCheck}
                label="Compliance"
                active={isActive('/dashboard/compliance')}
                onClick={() => handleNavigate('/dashboard/compliance')}
              />
              )}
            </CollapsibleSection>
          </div>
        )}

        {/* ═══════════════════════════════════
            DIVIDER
           ═══════════════════════════════════ */}
        <div className="my-3 border-t border-gray-200"></div>

        {/* ═══════════════════════════════════
            SETTINGS — Individual = flat NavItem, others = collapsible
           ═══════════════════════════════════ */}
        {isIndividual ? (
          <NavItem
            icon={Settings}
            label="Settings"
            active={isActive('/dashboard/settings')}
            onClick={() => handleNavigate('/dashboard/settings')}
          />
        ) : (
        <CollapsibleSection
          icon={Settings}
          label="Settings"
          expanded={settingsExpanded}
          onToggle={() => setSettingsExpanded(!settingsExpanded)}
        >
          {/* ✅ Contributors — Small+ (owner/ADMIN only) */}
          {isSmallOrAbove && canAccessContributors && (
            <SubNavItem
              icon={Users}
              label="Contributors"
              active={isActive('/dashboard/team')}
              onClick={() => handleNavigate('/dashboard/team')}
            />
          )}

          {/* Enterprise-only settings */}
          {isEnterprise && (
            <>
              <SubNavItem
                icon={Shield}
                label="Security"
                active={isActive('/dashboard/security')}
                onClick={() => handleNavigate('/dashboard/security')}
              />
            </>
          )}

          {/* ✅ Billing & Account — hidden for VIEWER + EDITOR */}
          {canAccessBilling && (
            <SubNavItem
              icon={CreditCard}
              label="Billing & Account"
              active={isActive('/dashboard/settings')}
              onClick={() => handleNavigate('/dashboard/settings')}
            />
          )}

          {/* Profile - Non-Individual tiers */}
          <SubNavItem
            icon={UserCircle}
            label="Profile"
            active={isActive('/dashboard/profile')}
            onClick={() => handleNavigate('/dashboard/profile')}
          />
        </CollapsibleSection>
        )}

        {/* ═══════════════════════════════════
            HELP & SUPPORT (Non-Individual only)
           ═══════════════════════════════════ */}
        {!isIndividual && (
        <NavItem
          icon={HelpCircle}
          label="Help & Support"
          active={isActive('/dashboard/support')}
          onClick={() => handleNavigate('/dashboard/support')}
        />
        )}
      </nav>

      {/* ═══════════════════════════════════
          BOTTOM SECTION: Storage + User + Logout
         ═══════════════════════════════════ */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50">
        {/* Storage Indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-500">Storage</p>
            <p className="text-xs font-semibold text-gray-700">{storagePercent}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${storagePercent}%`,
                background: storagePercent > 80
                  ? '#ef4444'
                  : 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))'
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {formatStorage(storageUsed)} of {formatStorage(storageLimit)}
          </p>
        </div>

        {/* User Profile — ✅ Clicks to Profile for VIEWER/EDITOR, Settings for owner/ADMIN */}
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors mb-2 cursor-pointer" onClick={() => handleNavigate(isIndividual ? '/dashboard/settings' : (canAccessBilling ? '/dashboard/settings' : '/dashboard/profile'))}>
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full gradient-btn flex items-center justify-center text-white font-semibold text-sm">
              {getInitials(user?.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Mobile Slide-out Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={closeMobileMenu}>
          <div className="absolute inset-0 bg-black/50 transition-opacity"></div>
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col animate-slideInLeft"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent isMobile />
          </div>
        </div>
      )}
    </>
  );
};

// ════════════════════════════════════
// Sub-Components
// ════════════════════════════════════

const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all ${
      active
        ? 'bg-purple-50 text-primary font-semibold'
        : 'text-gray-700 hover:bg-gray-50'
    }`}
  >
    <Icon size={18} className={active ? 'text-primary' : ''} />
    <span className="text-sm font-medium">{label}</span>
    {badge && (
      <span className="ml-auto text-xs px-1.5 py-0.5 bg-purple-100 text-primary rounded-full font-semibold">
        {badge}
      </span>
    )}
  </button>
);

const SubNavItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
      active
        ? 'bg-purple-50 text-primary font-semibold'
        : 'text-gray-600 hover:bg-gray-50'
    }`}
  >
    <Icon size={16} className={active ? 'text-primary' : ''} />
    <span>{label}</span>
  </button>
);

const CollapsibleSection = ({ icon: Icon, label, expanded, onToggle, children, badge }) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span className="text-sm font-medium">{label}</span>
        {badge && (
          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-primary rounded-full font-semibold">
            {badge}
          </span>
        )}
      </div>
      <ChevronDown
        size={16}
        className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}
      />
    </button>
    {expanded && (
      <div className="ml-6 mt-0.5 space-y-0.5">
        {children}
      </div>
    )}
  </div>
);

export default SidebarNav;
