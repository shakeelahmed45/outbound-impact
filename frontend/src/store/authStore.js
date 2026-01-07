import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ✅ FIXED: Add rehydration tracking for multi-tab support
const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false, // ✅ NEW: Track if state has been restored from localStorage
      
      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },
      
      setToken: (token) => {
        set({ token, isAuthenticated: true });
      },
      
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      // ✅ NEW: Called after rehydration completes
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage', // localStorage key name
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        // Don't persist _hasHydrated (reset to false on reload)
      }),
      onRehydrateStorage: () => (state) => {
        // ✅ NEW: Set hydration complete after state is restored
        state?.setHasHydrated(true);
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