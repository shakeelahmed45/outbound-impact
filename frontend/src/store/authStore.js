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
      
      setUser: (user) => {
        console.log('🔵 authStore.setUser called:', user ? 'User data exists' : 'No user data');
        set({ user, isAuthenticated: true });
      },
      
      setToken: (token) => {
        console.log('🔵 authStore.setToken called:', token ? 'Token exists' : 'No token');
        set({ token, isAuthenticated: true });
      },
      
      logout: () => {
        console.log('🔵 authStore.logout called');
        set({ user: null, token: null, isAuthenticated: false });
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
              isAuthenticated: state?.isAuthenticated
            });
            
            // ✅ CRITICAL: Set hydration complete
            state?.setHasHydrated(true);
          }
        };
      },
    }
  )
);

export default useAuthStore;

// Helper functions remain the same
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

export const canManageTeam = () => {
  const user = useAuthStore.getState().user;
  
  if (!user?.isTeamMember) {
    return true;
  }
  
  return user?.teamRole === 'ADMIN';
};