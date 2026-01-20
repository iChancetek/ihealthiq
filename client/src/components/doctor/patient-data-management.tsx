import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Filter, 
  Download, 
  RefreshCw, 
  Users, 
  UserCheck, 
  UserX, 
  AlertCircle,
  History,
  Shield,
  FileText,
  Calendar,
  Phone,
  Mail,
  MapPin
} from "lucide-react";

interface Patient {
  id: number;
  patientName: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth: string;
  patientId?: string;
  mrn?: string;
  email?: string;
  phoneNumber?: string;
  gender?: string;
  diagnosis?: string;
  physician?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy?: number;
}

interface PatientFormData {
  patientName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth: string;
  gender?: string;
  ssn?: string;
  mrn?: string;
  email?: string;
  phoneNumber?: string;
  diagnosis?: string;
  physician?: string;
  primaryCarePhysician?: string;
  allergies?: string[];
  specialNotes?: string;
  isActive: boolean;
  reason?: string;
}

interface AuditEntry {
  id: number;
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  createdAt: string;
  userId: number;
  ipAddress?: string;
}

export function PatientDataManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [patientFormData, setPatientFormData] = useState<PatientFormData>({
    patientName: "",
    dateOfBirth: "",
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch patients with pagination and filtering
  const { data: patientsData, isLoading: isLoadingPatients, refetch: refetchPatients } = useQuery({
    queryKey: ['/api/patients-data', currentPage, searchTerm, statusFilter, sortBy, sortOrder],
    queryFn: () => apiRequest(`/api/patients-data?page=${currentPage}&search=${searchTerm}&status=${statusFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}`)
  });

  // Fetch patient statistics
  const { data: statisticsData } = useQuery({
    queryKey: ['/api/patients-data/statistics'],
    queryFn: () => apiRequest('/api/patients-data/statistics')
  });

  // Fetch audit history for selected patient
  const { data: auditData, isLoading: isLoadingAudit } = useQuery({
    queryKey: ['/api/patients-data', selectedPatient?.id, 'audit-history'],
    queryFn: () => selectedPatient ? apiRequest(`/api/patients-data/${selectedPatient.id}/audit-history`) : null,
    enabled: !!selectedPatient && isAuditDialogOpen
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: (data: PatientFormData) => apiRequest('/api/patients-data', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      toast({
        title: "Patient Created",
        description: "New patient record has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      refetchPatients();
      queryClient.invalidateQueries({ queryKey: ['/api/patients-data/statistics'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create patient record.",
        variant: "destructive",
      });
    }
  });

  // Update patient mutation
  const updatePatientMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatientFormData }) => 
      apiRequest(`/api/patients-data/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Patient Updated",
        description: "Patient record has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      resetForm();
      refetchPatients();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update patient record.",
        variant: "destructive",
      });
    }
  });

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => 
      apiRequest(`/api/patients-data/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason })
      }),
    onSuccess: () => {
      toast({
        title: "Patient Deleted",
        description: "Patient record has been deleted successfully.",
      });
      refetchPatients();
      queryClient.invalidateQueries({ queryKey: ['/api/patients-data/statistics'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete patient record.",
        variant: "destructive",
      });
    }
  });

  // Helper functions
  const resetForm = () => {
    setPatientFormData({
      patientName: "",
      dateOfBirth: "",
      isActive: true
    });
    setSelectedPatient(null);
  };

  const openEditDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientFormData({
      patientName: patient.patientName || "",
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      dateOfBirth: patient.dateOfBirth || "",
      gender: patient.gender || "",
      mrn: patient.mrn || "",
      email: patient.email || "",
      phoneNumber: patient.phoneNumber || "",
      diagnosis: patient.diagnosis || "",
      physician: patient.physician || "",
      isActive: patient.isActive
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewDialogOpen(true);
  };

  const openAuditDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsAuditDialogOpen(true);
  };

  const handleDelete = (patient: Patient) => {
    const reason = prompt("Please provide a reason for deleting this patient record (required for HIPAA compliance):");
    if (reason && reason.trim()) {
      deletePatientMutation.mutate({ id: patient.id, reason: reason.trim() });
    } else {
      toast({
        title: "Deletion Cancelled",
        description: "A reason is required to delete patient records for HIPAA compliance.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedPatient) {
      // Update existing patient
      updatePatientMutation.mutate({ 
        id: selectedPatient.id, 
        data: {
          ...patientFormData,
          reason: patientFormData.reason || "Patient data updated via interface"
        }
      });
    } else {
      // Create new patient
      createPatientMutation.mutate(patientFormData);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (patient: Patient) => {
    if (patient.isDeleted) {
      return <Badge variant="destructive">Deleted</Badge>;
    }
    return patient.isActive ? 
      <Badge variant="default">Active</Badge> : 
      <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statisticsData?.statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statisticsData.statistics.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statisticsData.statistics.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <UserX className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{statisticsData.statistics.inactive}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recently Added</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statisticsData.statistics.recentlyAdded}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recently Updated</CardTitle>
              <RefreshCw className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{statisticsData.statistics.recentlyUpdated}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients by name, MRN, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Patients</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
          const [newSortBy, newSortOrder] = value.split('-');
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
            <SelectItem value="created-desc">Newest First</SelectItem>
            <SelectItem value="created-asc">Oldest First</SelectItem>
            <SelectItem value="updated-desc">Recently Updated</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Patient</DialogTitle>
              <DialogDescription>
                Add a new patient to the healthcare platform with HIPAA-compliant data handling.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patientName">Full Name *</Label>
                  <Input
                    id="patientName"
                    value={patientFormData.patientName}
                    onChange={(e) => setPatientFormData({...patientFormData, patientName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={patientFormData.dateOfBirth}
                    onChange={(e) => setPatientFormData({...patientFormData, dateOfBirth: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={patientFormData.firstName || ""}
                    onChange={(e) => setPatientFormData({...patientFormData, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={patientFormData.lastName || ""}
                    onChange={(e) => setPatientFormData({...patientFormData, lastName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={patientFormData.gender || ""} onValueChange={(value) => setPatientFormData({...patientFormData, gender: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mrn">Medical Record Number</Label>
                  <Input
                    id="mrn"
                    value={patientFormData.mrn || ""}
                    onChange={(e) => setPatientFormData({...patientFormData, mrn: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={patientFormData.email || ""}
                    onChange={(e) => setPatientFormData({...patientFormData, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={patientFormData.phoneNumber || ""}
                    onChange={(e) => setPatientFormData({...patientFormData, phoneNumber: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="diagnosis">Primary Diagnosis</Label>
                <Input
                  id="diagnosis"
                  value={patientFormData.diagnosis || ""}
                  onChange={(e) => setPatientFormData({...patientFormData, diagnosis: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="physician">Attending Physician</Label>
                <Input
                  id="physician"
                  value={patientFormData.physician || ""}
                  onChange={(e) => setPatientFormData({...patientFormData, physician: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="specialNotes">Special Notes</Label>
                <Textarea
                  id="specialNotes"
                  value={patientFormData.specialNotes || ""}
                  onChange={(e) => setPatientFormData({...patientFormData, specialNotes: e.target.value})}
                  rows={3}
                />
              </div>

              {selectedPatient && (
                <div>
                  <Label htmlFor="reason">Reason for Update (Required for Audit)</Label>
                  <Input
                    id="reason"
                    value={patientFormData.reason || ""}
                    onChange={(e) => setPatientFormData({...patientFormData, reason: e.target.value})}
                    placeholder="Describe why this update is being made..."
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  selectedPatient ? setIsEditDialogOpen(false) : setIsCreateDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPatientMutation.isPending || updatePatientMutation.isPending}
                >
                  {selectedPatient ? 'Update Patient' : 'Create Patient'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Patient List Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Records</CardTitle>
          <CardDescription>
            Comprehensive patient data management with HIPAA-compliant audit logging.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPatients ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientsData?.patients?.map((patient: Patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        {patient.patientName}
                        {patient.firstName && patient.lastName && (
                          <div className="text-sm text-muted-foreground">
                            {patient.firstName} {patient.lastName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{patient.mrn || patient.patientId || 'N/A'}</TableCell>
                      <TableCell>{formatDate(patient.dateOfBirth)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {patient.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1" />
                              {patient.email}
                            </div>
                          )}
                          {patient.phoneNumber && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1" />
                              {patient.phoneNumber}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{patient.diagnosis || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(patient)}</TableCell>
                      <TableCell>{formatDate(patient.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openViewDialog(patient)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(patient)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAuditDialog(patient)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {!patient.isDeleted && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(patient)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {patientsData?.pagination && (
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Showing {patientsData.pagination.count} of {patientsData.pagination.totalRecords} patients
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-2 text-sm">
                      Page {currentPage} of {patientsData.pagination.total}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(Math.min(patientsData.pagination.total, currentPage + 1))}
                      disabled={currentPage === patientsData.pagination.total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient: {selectedPatient?.patientName}</DialogTitle>
            <DialogDescription>
              Update patient information with HIPAA-compliant audit logging.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientName">Full Name *</Label>
                <Input
                  id="patientName"
                  value={patientFormData.patientName}
                  onChange={(e) => setPatientFormData({...patientFormData, patientName: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={patientFormData.dateOfBirth}
                  onChange={(e) => setPatientFormData({...patientFormData, dateOfBirth: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={patientFormData.firstName || ""}
                  onChange={(e) => setPatientFormData({...patientFormData, firstName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={patientFormData.lastName || ""}
                  onChange={(e) => setPatientFormData({...patientFormData, lastName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={patientFormData.gender || ""} onValueChange={(value) => setPatientFormData({...patientFormData, gender: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mrn">Medical Record Number</Label>
                <Input
                  id="mrn"
                  value={patientFormData.mrn || ""}
                  onChange={(e) => setPatientFormData({...patientFormData, mrn: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={patientFormData.email || ""}
                  onChange={(e) => setPatientFormData({...patientFormData, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={patientFormData.phoneNumber || ""}
                  onChange={(e) => setPatientFormData({...patientFormData, phoneNumber: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="diagnosis">Primary Diagnosis</Label>
              <Input
                id="diagnosis"
                value={patientFormData.diagnosis || ""}
                onChange={(e) => setPatientFormData({...patientFormData, diagnosis: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="physician">Attending Physician</Label>
              <Input
                id="physician"
                value={patientFormData.physician || ""}
                onChange={(e) => setPatientFormData({...patientFormData, physician: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="reason">Reason for Update (Required for Audit)</Label>
              <Input
                id="reason"
                value={patientFormData.reason || ""}
                onChange={(e) => setPatientFormData({...patientFormData, reason: e.target.value})}
                placeholder="Describe why this update is being made..."
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updatePatientMutation.isPending}
              >
                Update Patient
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Patient Details: {selectedPatient?.patientName}</DialogTitle>
            <DialogDescription>
              Comprehensive patient information and medical data.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPatient && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                  <p>{selectedPatient.patientName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                  <p>{formatDate(selectedPatient.dateOfBirth)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">MRN</Label>
                  <p>{selectedPatient.mrn || selectedPatient.patientId || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <p>{getStatusBadge(selectedPatient)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p>{selectedPatient.email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p>{selectedPatient.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Primary Diagnosis</Label>
                  <p>{selectedPatient.diagnosis || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Attending Physician</Label>
                  <p>{selectedPatient.physician || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <p>{formatDate(selectedPatient.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                  <p>{formatDate(selectedPatient.updatedAt)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => openAuditDialog(selectedPatient)}>
                  <History className="h-4 w-4 mr-2" />
                  View Audit Log
                </Button>
                <Button onClick={() => {
                  setIsViewDialogOpen(false);
                  openEditDialog(selectedPatient);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Patient
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit History Dialog */}
      <Dialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                HIPAA Audit Log: {selectedPatient?.patientName}
              </div>
            </DialogTitle>
            <DialogDescription>
              Complete audit trail of all patient data access and modifications for regulatory compliance.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh]">
            {isLoadingAudit ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {auditData?.auditHistory?.map((entry: AuditEntry) => (
                  <Card key={entry.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{entry.action}</Badge>
                          {entry.fieldChanged && (
                            <Badge variant="secondary">{entry.fieldChanged}</Badge>
                          )}
                        </div>
                        {entry.reason && (
                          <p className="text-sm text-muted-foreground mb-2">{entry.reason}</p>
                        )}
                        {entry.oldValue && entry.newValue && (
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="font-medium">From:</span> {entry.oldValue}
                            </div>
                            <div>
                              <span className="font-medium">To:</span> {entry.newValue}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{formatDate(entry.createdAt)}</div>
                        <div>User ID: {entry.userId}</div>
                        {entry.ipAddress && <div>IP: {entry.ipAddress}</div>}
                      </div>
                    </div>
                  </Card>
                ))}
                {auditData?.auditHistory?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No audit entries found for this patient.
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}