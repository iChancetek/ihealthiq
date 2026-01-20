import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
  isApproved: boolean;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Get user data from server for authentication
  const { data: serverUser, isLoading, error } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Update authentication state based on server response
  useEffect(() => {
    if (serverUser && !error) {
      setIsAuthenticated(true);
      setUser(serverUser);
    } else if (error || !serverUser) {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [serverUser, error]);

  const logout = async () => {
    try {
      // Call server logout endpoint to destroy session
      await apiRequest("/api/auth/logout", {
        method: "POST"
      });
      
      // Clear all client-side state
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies by setting them to expire
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Force complete page reload to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      // Force reload even if server call fails
      window.location.reload();
    }
  };

  const getCurrentUser = (): AuthUser | null => {
    return serverUser || user;
  };

  const hasRole = (requiredRole: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || typeof currentUser !== 'object') return false;
    const userRole = (currentUser as any).role;
    return userRole === requiredRole || userRole === 'admin';
  };

  return {
    isAuthenticated,
    user: getCurrentUser(),
    isLoading,
    logout,
    hasRole,
    error
  };
}

// Authentication context for API requests
export function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}