import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import safariFriendlyStorage from '../utils/safariFriendlyStorage';

// ✅ SAFARI FIX: Use Safari-friendly storage that falls back to cookies
const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false, // ✅ Track if state has been restored from localStorage
      permissions: null,   // 🆕 NEW: Store user permissions
      
      setUser: (user) => {
        console.log('🔵 authStore.setUser called:', user ? 'User data exists' : 'No user data');
        
        // 🆕 NEW: Calculate permissions based on role
        const permissions = getUserPermissionsFromRole(user?.role);
        
        set({ 
          user, 
          isAuthenticated: true,
          permissions  // 🆕 NEW: Store permissions
        });
      },
      
      setToken: (token) => {
        console.log('🔵 authStore.setToken called:', token ? 'Token exists' : 'No token');
        set({ token, isAuthenticated: true });
      },
      
      logout: () => {
        console.log('🔵 authStore.logout called');
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          permissions: null  // 🆕 NEW: Clear permissions
        });
      },
      
      // ✅ Called after rehydration completes
      setHasHydrated: (state) => {
        console.log('🔵 authStore.setHasHydrated called:', state);
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage', // Storage key name
      storage: createJSONStorage(() => safariFriendlyStorage), // ✅ SAFARI FIX: Use wrapper instead of localStorage
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,  // 🆕 NEW: Persist permissions
        // Don't persist _hasHydrated (reset to false on reload)
      }),
      onRehydrateStorage: () => {
        console.log('🔄 Zustand persist: Starting rehydration from storage...');
        
        return (state, error) => {
          if (error) {
            console.error('❌ Zustand persist: Rehydration FAILED:', error);
          } else {
            console.log('✅ Zustand persist: Rehydration complete!');
            console.log('📊 Restored state:', {
              hasUser: !!state?.user,
              hasToken: !!state?.token,
              isAuthenticated: state?.isAuthenticated,
              role: state?.user?.role,  // 🆕 NEW: Log role
            });
            
            // ✅ CRITICAL: Set hydration complete
            state?.setHasHydrated(true);
          }
        };
      },
    }
  )
);

// ═══════════════════════════════════════════════════════════
// 🆕 NEW: Get permissions based on role
// ═══════════════════════════════════════════════════════════
const getUserPermissionsFromRole = (role) => {
  const permissionsMap = {
    ADMIN: {
      canViewDashboard: true,
      canManageUsers: true,
      canManageItems: true,
      canManageFeedback: true,
      canManageLiveChat: true,
      canManageTeam: true,
      canViewAnalytics: true,
      canManageSettings: true,
    },
    CUSTOMER_SUPPORT: {
      canViewDashboard: false,
      canManageUsers: false,
      canManageItems: false,
      canManageFeedback: false,
      canManageLiveChat: true,  // ONLY THIS!
      canManageTeam: false,
      canViewAnalytics: false,
      canManageSettings: false,
    },
    // Regular users have no admin permissions
    INDIVIDUAL: {},
    ORG_SMALL: {},
    ORG_MEDIUM: {},
    ORG_ENTERPRISE: {},
  };

  return permissionsMap[role] || {};
};

export default useAuthStore;

// ═══════════════════════════════════════════════════════════
// EXISTING Helper functions
// ═══════════════════════════════════════════════════════════
export const getEffectiveUserId = () => {
  const user = useAuthStore.getState().user;
  
  if (user?.isTeamMember && user?.organization?.id) {
    return user.organization.id;
  }
  
  return user?.id;
};

export const isTeamMember = () => {
  const user = useAuthStore.getState().user;
  return user?.isTeamMember === true;
};

export const getTeamRole = () => {
  const user = useAuthStore.getState().user;
  return user?.teamRole || null;
};

export const canEdit = () => {
  const user = useAuthStore.getState().user;
  
  if (!user?.isTeamMember) {
    return true;
  }
  
  return user?.teamRole === 'ADMIN' || user?.teamRole === 'EDITOR';
};

// ✅ NEW: canDelete — only ADMIN + account owner can delete content
export const canDelete = () => {
  const user = useAuthStore.getState().user;
  
  if (!user?.isTeamMember) {
    return true; // Account owner
  }
  
  return user?.teamRole === 'ADMIN';
};

export const canManageTeam = () => {
  const user = useAuthStore.getState().user;
  
  if (!user?.isTeamMember) {
    return true;
  }
  
  return user?.teamRole === 'ADMIN';
};

// ═══════════════════════════════════════════════════════════
// ✅ Feature-based access control for team members
// Account owners + ADMIN = always full access
// VIEWER/EDITOR = only features in their allowedFeatures array
// ═══════════════════════════════════════════════════════════
export const hasFeature = (featureKey) => {
  const user = useAuthStore.getState().user;
  
  // Not a team member (account owner) = full access
  if (!user?.isTeamMember) return true;
  
  // ADMIN team members = full access
  if (user?.teamRole === 'ADMIN') return true;
  
  // VIEWER/EDITOR: check allowedFeatures array
  // null/undefined = never set (existing members) = FULL ACCESS (backward compatible)
  // empty array [] = explicitly no features granted
  const features = user?.allowedFeatures;
  if (!features) return true; // ✅ Existing members keep full access
  if (!Array.isArray(features)) return true;
  
  return features.includes(featureKey);
};

// ═══════════════════════════════════════════════════════════
// 🆕 NEW: Permission checking helpers
// ═══════════════════════════════════════════════════════════
export const isAdmin = () => {
  const user = useAuthStore.getState().user;
  return user?.role === 'ADMIN';
};

export const isCustomerSupport = () => {
  const user = useAuthStore.getState().user;
  return user?.role === 'CUSTOMER_SUPPORT';
};

export const isAdminOrSupport = () => {
  const user = useAuthStore.getState().user;
  return user?.role === 'ADMIN' || user?.role === 'CUSTOMER_SUPPORT';
};

export const hasPermission = (permission) => {
  const permissions = useAuthStore.getState().permissions;
  return permissions?.[permission] === true;
};

// Get all permissions
export const getPermissions = () => {
  return useAuthStore.getState().permissions || {};
};

// Check multiple permissions at once
export const hasAllPermissions = (...requiredPermissions) => {
  const permissions = getPermissions();
  return requiredPermissions.every(perm => permissions[perm] === true);
};

export const hasAnyPermission = (...requiredPermissions) => {
  const permissions = getPermissions();
  return requiredPermissions.some(perm => permissions[perm] === true);
};