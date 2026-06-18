import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, login, logout, updateUser } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading: false, 
    login,
    logout,
    updateUser,
    updateProfile: async (data: any) => {
      updateUser(data);
    }
  };
};