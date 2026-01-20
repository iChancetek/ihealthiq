import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, UserPlus, UserCheck, UserX, Settings, Shield, 
  MoreVertical, Edit, Trash2, Plus, Search, Eye, Activity,
  Clock, Key, AlertTriangle, FileText, Download
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
  isApproved: boolean;
  requirePasswordChange?: boolean;
}

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  resourceType: string;
  resourceId?: number;
  details: any;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  createdAt: string;
}

interface UserActivityLog {
  id: number;
  userId: number;
  activityType: string;
  moduleName: string;
  resourceType?: string;
  resourceId?: number;
  duration?: number;
  createdAt: string;
}

export default function AdminManagement() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  // Check if user has admin privileges
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator';

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if user is not an admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <Shield className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You do not have permission to access the Admin Management module. 
            This area is restricted to administrators only.
          </p>
          <p className="text-sm text-gray-500">
            Current role: <span className="font-medium">{user?.role || 'Unknown'}</span>
          </p>
        </div>
      </div>
    );
  }
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "clinical_staff",
    department: "",
    licenseNumber: "",
    requirePasswordChange: false
  });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/auth/users"],
    staleTime: 1000 * 60 * 2 // 2 minutes
  });

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-logs"],
    staleTime: 1000 * 60 * 1 // 1 minute
  });

  const { data: userActivityLogs = [] } = useQuery<UserActivityLog[]>({
    queryKey: ["/api/admin/user-activity"],
    staleTime: 1000 * 60 * 1 // 1 minute
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(userData)
      });
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "New user account has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
      setNewUser({
        username: "",
        email: "",
        password: "",
        role: "clinical_staff",
        department: "",
        licenseNumber: "",
        requirePasswordChange: false
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create user account",
        variant: "destructive",
      });
    }
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/auth/users/${userId}/approve`, {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      toast({
        title: "User Approved",
        description: "User account has been approved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
    }
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/auth/users/${userId}/deactivate`, {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      toast({
        title: "User Deactivated",
        description: "User account has been deactivated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
    }
  });

  const activateUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/auth/users/${userId}/activate`, {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      toast({
        title: "User Activated",
        description: "User account has been activated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
    }
  });

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword, requireChange }: { userId: number; newPassword: string; requireChange: boolean }) => {
      return await apiRequest(`/api/admin/reset-password/${userId}`, {
        method: "POST",
        body: JSON.stringify({ newPassword, requirePasswordChange: requireChange })
      });
    },
    onSuccess: () => {
      toast({
        title: "Password Reset",
        description: "User password has been reset successfully",
      });
      setShowPasswordReset(false);
      setNewPassword("");
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
    }
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role, department }: { userId: number; role: string; department: string }) => {
      return await apiRequest(`/api/auth/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role, department })
      });
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "User role and department have been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
    }
  });

  // Update user details mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: { userId: number; username: string; email: string; role: string; department: string; requirePasswordChange?: boolean }) => {
      return await apiRequest(`/api/auth/users/${userData.userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          role: userData.role,
          department: userData.department,
          requirePasswordChange: userData.requirePasswordChange
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User details have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
      setShowEditModal(false);
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user details",
        variant: "destructive",
      });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, department }: { userId: number; role: string; department: string }) => {
      return await apiRequest(`/api/auth/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role, department })
      });
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "User role has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/auth/users/${userId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "User Removed",
        description: "User account has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
    }
  });

  const filteredUsers = (users as User[]).filter((user: User) => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUser);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "administrator": return "bg-red-100 text-red-800";
      case "admin": return "bg-red-100 text-red-800";
      case "clinical_staff": return "bg-blue-100 text-blue-800";
      case "nurse": return "bg-green-100 text-green-800";
      case "physician": return "bg-purple-100 text-purple-800";
      case "doctor": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-600" />
          Admin Management Panel
        </h1>
        <p className="text-gray-600 mt-2">
          Manage user accounts, roles, and system permissions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Create User
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            User Activity
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Accounts
              </CardTitle>
              <CardDescription>
                Manage all user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="administrator">Administrator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="clinical_staff">Clinical Staff</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="physician">Physician</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading users...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((user: User) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{user.username}</h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <p className="text-sm text-gray-500">{user.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getRoleColor(user.role)}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant={user.isApproved ? "default" : "destructive"}>
                          {user.isApproved ? "Approved" : "Pending"}
                        </Badge>
                        <div className="flex gap-2">
                          {!user.isApproved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveUserMutation.mutate(user.id)}
                              disabled={approveUserMutation.isPending}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUser(user);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => user.isActive ? 
                              deactivateUserMutation.mutate(user.id) : 
                              activateUserMutation.mutate(user.id)
                            }
                            disabled={deactivateUserMutation.isPending || activateUserMutation.isPending}
                          >
                            {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUserMutation.mutate(user.id)}
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create New User
              </CardTitle>
              <CardDescription>
                Add a new user account to the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clinical_staff">Clinical Staff</SelectItem>
                        <SelectItem value="nurse">Nurse</SelectItem>
                        <SelectItem value="physician">Physician</SelectItem>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="administrator">Administrator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={newUser.department}
                      onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="licenseNumber">License Number (Optional)</Label>
                  <Input
                    id="licenseNumber"
                    value={newUser.licenseNumber}
                    onChange={(e) => setNewUser({...newUser, licenseNumber: e.target.value})}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requirePasswordChange"
                    checked={newUser.requirePasswordChange}
                    onCheckedChange={(checked) => setNewUser({...newUser, requirePasswordChange: checked as boolean})}
                  />
                  <Label htmlFor="requirePasswordChange" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Require user to change password on next sign-in
                  </Label>
                </div>

                <Button type="submit" disabled={createUserMutation.isPending} className="w-full">
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                System Audit Logs
              </CardTitle>
              <CardDescription>
                View comprehensive audit trail of all system activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Showing {auditLogs.length} audit entries
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Logs
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {new Date(log.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>User #{log.userId}</TableCell>
                            <TableCell>{log.action}</TableCell>
                            <TableCell>
                              {log.resourceType}
                              {log.resourceId && ` #${log.resourceId}`}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                log.success 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {log.success ? 'Success' : 'Failed'}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.ipAddress}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                User Activity Tracking
              </CardTitle>
              <CardDescription>
                Monitor user access patterns and module usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-blue-600">{userActivityLogs.length}</h3>
                        <p className="text-sm text-gray-600">Total Activities</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-green-600">
                          {userActivityLogs.filter(log => log.activityType === 'login').length}
                        </h3>
                        <p className="text-sm text-gray-600">Login Sessions</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-purple-600">
                          {userActivityLogs.filter(log => log.activityType === 'module_access').length}
                        </h3>
                        <p className="text-sm text-gray-600">Module Access</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-orange-600">
                          {userActivityLogs.filter(log => log.activityType === 'document_upload').length}
                        </h3>
                        <p className="text-sm text-gray-600">Document Uploads</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Activity Type</TableHead>
                        <TableHead>Module/Resource</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userActivityLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No user activity found
                          </TableCell>
                        </TableRow>
                      ) : (
                        userActivityLogs.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell className="font-mono text-sm">
                              {new Date(activity.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>User #{activity.userId}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                activity.activityType === 'login' ? 'bg-blue-100 text-blue-800' :
                                activity.activityType === 'module_access' ? 'bg-purple-100 text-purple-800' :
                                activity.activityType === 'document_upload' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {activity.activityType.replace('_', ' ').toUpperCase()}
                              </span>
                            </TableCell>
                            <TableCell>
                              {activity.moduleName}
                              {activity.resourceType && ` (${activity.resourceType})`}
                            </TableCell>
                            <TableCell>
                              {activity.duration ? `${activity.duration}s` : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Management
              </CardTitle>
              <CardDescription>
                Advanced security controls and password management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-blue-600">{(users as User[]).length}</h3>
                        <p className="text-sm text-gray-600">Total Users</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-green-600">
                          {(users as User[]).filter((u: User) => u.isActive).length}
                        </h3>
                        <p className="text-sm text-gray-600">Active Users</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-orange-600">
                          {(users as User[]).filter((u: User) => !u.isApproved).length}
                        </h3>
                        <p className="text-sm text-gray-600">Pending Approval</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Password Reset Section */}
                <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                  <h3 className="font-medium text-red-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Password Reset Controls
                  </h3>
                  <p className="text-sm text-red-800 mb-4">
                    Use these controls to reset user passwords and manage account security.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="selectUser">Select User for Password Reset</Label>
                      <Select onValueChange={(value) => setSelectedUser(users.find(u => u.id === parseInt(value)) || null)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.username} ({user.email}) - {user.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedUser && (
                      <div className="mt-4 p-4 border rounded-lg bg-white">
                        <h4 className="font-medium mb-3">Reset Password for: {selectedUser.username}</h4>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="requireChange"
                              checked={requirePasswordChange}
                              onCheckedChange={(checked) => setRequirePasswordChange(checked as boolean)}
                            />
                            <Label htmlFor="requireChange" className="text-sm">
                              Require user to change password on next sign-in
                            </Label>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                if (newPassword.length >= 8) {
                                  resetPasswordMutation.mutate({
                                    userId: selectedUser.id,
                                    newPassword,
                                    requireChange: requirePasswordChange
                                  });
                                } else {
                                  toast({
                                    title: "Invalid Password",
                                    description: "Password must be at least 8 characters long",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              disabled={resetPasswordMutation.isPending || !newPassword}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(null);
                                setNewPassword("");
                                setRequirePasswordChange(true);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">System Security Status</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-800">All security systems operational</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Settings</DialogTitle>
            <DialogDescription>
              Update user account information and settings
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editUsername">Username</Label>
                <Input
                  id="editUsername"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <Label htmlFor="editRole">Role</Label>
                <Select value={editingUser.role} onValueChange={(value) => setEditingUser({...editingUser, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinical_staff">Clinical Staff</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="physician">Physician</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="administrator">Administrator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="editDepartment">Department</Label>
                <Input
                  id="editDepartment"
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                  placeholder="Enter department"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editRequirePasswordChange"
                  checked={editingUser.requirePasswordChange || false}
                  onCheckedChange={(checked) => setEditingUser({...editingUser, requirePasswordChange: checked as boolean})}
                />
                <Label htmlFor="editRequirePasswordChange" className="text-sm">
                  Require password change on next sign-in
                </Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingUser) {
                  updateUserMutation.mutate({
                    userId: editingUser.id,
                    username: editingUser.username,
                    email: editingUser.email,
                    role: editingUser.role,
                    department: editingUser.department,
                    requirePasswordChange: editingUser.requirePasswordChange
                  });
                }
              }}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}