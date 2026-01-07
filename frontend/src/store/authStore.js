import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ✅ FIXED: Use Zustand persist middleware for automatic localStorage sync
const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },
      
      setToken: (token) => {
        set({ token, isAuthenticated: true });
      },
      
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage', // ✅ localStorage key name
      storage: createJSONStorage(() => localStorage), // ✅ Use localStorage
      partialize: (state) => ({
        // ✅ Only persist these fields
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;

// ✅ Helper functions remain the same
export const getEffectiveUserId = () => {
  const user = useAuthStore.getState().user;
  
  // If user is a team member, use organization ID for data fetching
  if (user?.isTeamMember && user?.organization?.id) {
    return user.organization.id;
  }
  
  // Otherwise use their own ID
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
  
  // Organization owners can always edit
  if (!user?.isTeamMember) {
    return true;
  }
  
  // Team members: ADMIN and EDITOR can edit, VIEWER cannot
  return user?.teamRole === 'ADMIN' || user?.teamRole === 'EDITOR';
};

export const canManageTeam = () => {
  const user = useAuthStore.getState().user;
  
  // Organization owners can manage team
  if (!user?.isTeamMember) {
    return true;
  }
  
  // Only ADMIN team members can manage team
  return user?.teamRole === 'ADMIN';
};