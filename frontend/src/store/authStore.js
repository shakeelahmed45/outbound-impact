import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null, // ✅ FIXED: Load user from localStorage
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'), // ✅ FIXED: Initialize based on token existence
  
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user)); // ✅ FIXED: Save user to localStorage
    set({ user, isAuthenticated: true });
  },
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: true }); // ✅ FIXED: Set isAuthenticated when token is set
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // ✅ FIXED: Remove user from localStorage
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

export default useAuthStore;

// Add these AFTER: export default useAuthStore;

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