import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Clock, AlertTriangle, User, CreditCard, Calendar, FileText, RefreshCw, Search, Upload, File, X, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EligibilityVerificationRequest {
  patientId: number;
  insuranceType: 'MEDICARE' | 'MEDICAID' | 'MCO';
  memberNumber: string;
  dateOfBirth: string;
  lastName: string;
  verificationReason?: string;
}

interface EligibilityResult {
  success: boolean;
  status: 'VERIFIED' | 'NOT_VERIFIED' | 'PENDING' | 'ERROR';
  eligibilityData: any;
  coverageSummary: {
    isActive: boolean;
    effectiveDate: string | null;
    expirationDate: string | null;
    benefits: string[];
    copayAmount: number;
    deductibleAmount: number;
    requiresPriorAuth: boolean;
    priorAuthServices: string[];
  };
  recommendations: string[];
  confidenceScore: number;
  verificationTimestamp: string;
  errors?: string[];
}

interface Patient {
  id: number;
  patientName: string;
  dateOfBirth: string;
  patientId: string;
  diagnosis: string;
  physician: string;
  insuranceInfo: any;
}

export default function EligibilityCheck() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [verificationRequest, setVerificationRequest] = useState<Partial<EligibilityVerificationRequest>>({});
  const [activeTab, setActiveTab] = useState("verify");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch patients
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['/api/patients'],
    select: (data: Patient[]) => data.filter(patient => 
      patient.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patientId.toLowerCase().includes(searchTerm.toLowerCase())
    )
  });

  // Fetch eligibility history for selected patient
  const { data: eligibilityHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/eligibility/history', selectedPatient?.id],
    enabled: !!selectedPatient?.id
  });

  // Fetch coverage reports
  const { data: coverageReports, isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/eligibility/coverage-reports']
  });

  // Eligibility verification mutation
  const verifyEligibilityMutation = useMutation({
    mutationFn: async (request: EligibilityVerificationRequest) => {
      const response = await fetch('/api/eligibility/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Verification failed');
      }
      
      return response.json();
    },
    onSuccess: (result: EligibilityResult) => {
      toast({
        title: result.success ? "Verification Complete" : "Verification Failed",
        description: result.success 
          ? `${result.status} - Confidence: ${result.confidenceScore}%`
          : result.errors?.[0] || "Unknown error occurred"
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/eligibility/history'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Re-verification mutation
  const reverifyMutation = useMutation({
    mutationFn: async (verificationId: number) => {
      const response = await fetch(`/api/eligibility/reverify/${verificationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Re-verification failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Re-verification Complete" });
      queryClient.invalidateQueries({ queryKey: ['/api/eligibility/history'] });
    }
  });

  // File upload mutation
  const uploadFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setIsUploading(true);
      const formData = new FormData();
      
      files.forEach((file, index) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/eligibility/upload-documents', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'File upload failed');
      }

      return response.json();
    },
    onSuccess: async (result) => {
      // Show primary success message
      toast({
        title: "Documents Uploaded Successfully",
        description: `${result.uploadedFiles?.length || 0} files processed for eligibility verification`
      });

      // Display information about newly created patients
      if (result.createdPatients?.length > 0) {
        const patientNames = result.createdPatients.map(p => p.patientName).join(', ');
        toast({
          title: "New Patients Created",
          description: `${result.createdPatients.length} new patient records created: ${patientNames}`
        });

        // Refresh the patient list to show new patients
        queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      }
      
      // Create eligibility verification records for uploaded documents
      if (result.uploadedFiles?.length > 0) {
        try {
          let patientToUse = selectedPatient;
          
          // If no patient is selected and we have newly created patients, use the first new one
          if (!patientToUse && result.createdPatients?.length > 0) {
            patientToUse = result.createdPatients[0];
            setSelectedPatient(result.createdPatients[0]);
            
            toast({
              title: "Patient Auto-Selected",
              description: `${result.createdPatients[0].patientName} (newly created) has been automatically selected for verification.`
            });
          }
          // If no patient is selected and no new patients, use existing patients
          else if (!patientToUse && patients && patients.length > 0) {
            patientToUse = patients[0];
            setSelectedPatient(patients[0]);
            
            toast({
              title: "Patient Auto-Selected",
              description: `${patients[0].patientName} has been automatically selected for verification record creation.`
            });
          }
          
          if (patientToUse) {
            const response = await fetch('/api/eligibility/create-verification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                patientId: patientToUse.id,
                insuranceType: 'Document Upload',
                verificationData: {
                  uploadedFiles: result.uploadedFiles,
                  eligibilityInsights: result.eligibilityInsights,
                  processingMetadata: result.processingMetadata,
                  createdPatients: result.createdPatients || []
                },
                status: 'verified'
              })
            });
            
            if (response.ok) {
              // Invalidate eligibility history to refresh the data
              queryClient.invalidateQueries({ queryKey: ['/api/eligibility/history', patientToUse.id] });
              queryClient.invalidateQueries({ queryKey: ['/api/eligibility/history'] });
              queryClient.invalidateQueries({ queryKey: ['/api/eligibility/coverage-reports'] });
              
              toast({
                title: "Verification Record Created",
                description: `Eligibility verification added to ${patientToUse.patientName}'s history. Check the History tab to view details.`
              });

              // Auto-switch to history tab to show the new record
              setTimeout(() => {
                const historyTab = document.querySelector('[data-value="history"]') as HTMLElement;
                if (historyTab) {
                  historyTab.click();
                }
              }, 1500);
            }
          } else {
            console.warn('No patients available to create verification record');
          }
        } catch (error) {
          console.error('Error creating verification record:', error);
        }
      }
      
      setUploadedFiles([]);
      setUploadProgress({});
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed", 
        description: error.message,
        variant: "destructive"
      });
      setIsUploading(false);
    }
  });

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    const insuranceInfo = patient.insuranceInfo;
    
    // Pre-populate form with patient data
    setVerificationRequest({
      patientId: patient.id,
      memberNumber: insuranceInfo?.id || '',
      dateOfBirth: patient.dateOfBirth,
      lastName: patient.patientName.split(' ').slice(1).join(' '),
      insuranceType: insuranceInfo?.provider?.includes('Medicare') ? 'MEDICARE' :
                   insuranceInfo?.provider?.includes('Medicaid') ? 'MEDICAID' : 'MCO'
    });
  };

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} exceeds 100MB limit`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      toast({
        title: "Files Selected",
        description: `${validFiles.length} files ready for upload`
      });
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No Files Selected", 
        description: "Please select documents to upload",
        variant: "destructive"
      });
      return;
    }

    uploadFilesMutation.mutate(uploadedFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleVerification = () => {
    if (!verificationRequest.patientId || !verificationRequest.insuranceType || !verificationRequest.memberNumber) {
      toast({
        title: "Missing Information",
        description: "Please complete all required fields",
        variant: "destructive"
      });
      return;
    }

    verifyEligibilityMutation.mutate(verificationRequest as EligibilityVerificationRequest);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
      case 'VERIFIED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'not_verified':
      case 'NOT_VERIFIED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
      case 'VERIFIED':
        return 'bg-green-100 text-green-800';
      case 'not_verified':
      case 'NOT_VERIFIED':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Eligibility Verification</h1>
          <p className="text-muted-foreground">Medicare, Medicaid, and MCO coverage verification</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <CreditCard className="h-4 w-4 mr-2" />
          Insurance Verification
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="verify">New Verification</TabsTrigger>
          <TabsTrigger value="history">Verification History</TabsTrigger>
          <TabsTrigger value="reports">Coverage Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="verify" className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Document Upload & AI Processing
              </CardTitle>
              <CardDescription>
                Upload insurance documents, eligibility letters, or supporting files for AI-enhanced verification (Max: 100MB per file)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Area */}
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Supports all formats: PDF, DOC, DOCX, XLS, XLSX, TXT, PNG, JPG, TIFF, etc.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 100MB per file
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
              />

              {/* Selected Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Selected Files ({uploadedFiles.length})</h4>
                    <Button
                      onClick={handleUploadFiles}
                      disabled={isUploading || uploadFilesMutation.isPending}
                      size="sm"
                    >
                      {isUploading || uploadFilesMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload & Process
                        </>
                      )}
                    </Button>
                  </div>

                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <File className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{file.name}</p>
                              <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            disabled={isUploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing documents...</span>
                    <span>AI Analysis in progress</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              )}

              {/* Upload Results */}
              {uploadFilesMutation.data && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully processed {uploadFilesMutation.data.uploadedFiles?.length || 0} documents. 
                    AI eligibility insights extracted and available for verification.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Selection
                </CardTitle>
                <CardDescription>
                  Search and select a patient for eligibility verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or patient ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {patientsLoading ? (
                      <div className="text-center py-4">Loading patients...</div>
                    ) : patients?.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No patients found</div>
                    ) : (
                      patients?.map((patient) => (
                        <Card 
                          key={patient.id}
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedPatient?.id === patient.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{patient.patientName}</p>
                                <p className="text-sm text-muted-foreground">ID: {patient.patientId}</p>
                                <p className="text-sm text-muted-foreground">DOB: {patient.dateOfBirth}</p>
                              </div>
                              <Badge variant="outline">
                                {patient.insuranceInfo?.provider || 'Unknown'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Verification Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Verification Details
                </CardTitle>
                <CardDescription>
                  Configure eligibility verification parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPatient ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="insuranceType">Insurance Type</Label>
                        <Select 
                          value={verificationRequest.insuranceType} 
                          onValueChange={(value) => setVerificationRequest(prev => ({ ...prev, insuranceType: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MEDICARE">Medicare</SelectItem>
                            <SelectItem value="MEDICAID">Medicaid</SelectItem>
                            <SelectItem value="MCO">Managed Care (MCO)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="memberNumber">Member Number</Label>
                        <Input
                          id="memberNumber"
                          value={verificationRequest.memberNumber || ''}
                          onChange={(e) => setVerificationRequest(prev => ({ ...prev, memberNumber: e.target.value }))}
                          placeholder="Insurance member ID"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={verificationRequest.dateOfBirth || ''}
                          onChange={(e) => setVerificationRequest(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={verificationRequest.lastName || ''}
                          onChange={(e) => setVerificationRequest(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Patient last name"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="verificationReason">Verification Reason (Optional)</Label>
                      <Textarea
                        id="verificationReason"
                        value={verificationRequest.verificationReason || ''}
                        onChange={(e) => setVerificationRequest(prev => ({ ...prev, verificationReason: e.target.value }))}
                        placeholder="Reason for verification..."
                        rows={3}
                      />
                    </div>

                    <Button 
                      onClick={handleVerification}
                      disabled={verifyEligibilityMutation.isPending}
                      className="w-full"
                    >
                      {verifyEligibilityMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify Eligibility
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Please select a patient to begin eligibility verification.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Verification Results */}
          {verifyEligibilityMutation.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(verifyEligibilityMutation.data.status)}
                  Verification Results
                </CardTitle>
                <CardDescription>
                  Coverage verification completed on {new Date(verifyEligibilityMutation.data.verificationTimestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {verifyEligibilityMutation.data.confidenceScore}%
                    </div>
                    <div className="text-sm text-muted-foreground">Confidence Score</div>
                  </div>
                  <div className="text-center">
                    <Badge className={getStatusColor(verifyEligibilityMutation.data.status)}>
                      {verifyEligibilityMutation.data.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">Verification Status</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      ${verifyEligibilityMutation.data.coverageSummary.copayAmount}
                    </div>
                    <div className="text-sm text-muted-foreground">Copay Amount</div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Coverage Benefits</h4>
                    <div className="space-y-2">
                      {verifyEligibilityMutation.data.coverageSummary.benefits.map((benefit: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm capitalize">{benefit.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Coverage Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Effective Date:</span>
                        <span>{verifyEligibilityMutation.data.coverageSummary.effectiveDate || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deductible:</span>
                        <span>${verifyEligibilityMutation.data.coverageSummary.deductibleAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Prior Auth Required:</span>
                        <span>{verifyEligibilityMutation.data.coverageSummary.requiresPriorAuth ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {verifyEligibilityMutation.data.recommendations.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3">AI Recommendations</h4>
                      <div className="space-y-2">
                        {verifyEligibilityMutation.data.recommendations.map((rec: string, index: number) => (
                          <Alert key={index}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{rec}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Verification History
              </CardTitle>
              <CardDescription>
                {selectedPatient 
                  ? `Eligibility verification history for ${selectedPatient.patientName}`
                  : "Select a patient to view verification history"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedPatient ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please select a patient from the verification tab to view their history.
                  </AlertDescription>
                </Alert>
              ) : historyLoading ? (
                <div className="text-center py-8">Loading verification history...</div>
              ) : !eligibilityHistory || eligibilityHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No verification history found for this patient.
                </div>
              ) : (
                <div className="space-y-4">
                  {eligibilityHistory.map((verification: any) => (
                    <Card key={verification.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(verification.status)}
                            <div>
                              <div className="font-medium">{verification.insuranceType}</div>
                              <div className="text-sm text-muted-foreground">
                                {verification.verifiedAt 
                                  ? new Date(verification.verifiedAt).toLocaleDateString()
                                  : 'Pending verification'
                                }
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(verification.status)}>
                              {verification.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reverifyMutation.mutate(verification.id)}
                              disabled={reverifyMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {reportsLoading ? (
            <div className="text-center py-8">Loading coverage reports...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Medicare Verifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {coverageReports?.monthlyStats?.medicare || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">This month</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Medicaid Verifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {coverageReports?.monthlyStats?.medicaid || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">This month</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">MCO Verifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      {coverageReports?.monthlyStats?.mco || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">This month</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Document Uploads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                      {coverageReports?.monthlyStats?.documentUploads || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">This month</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Verification Success Rate</CardTitle>
                  <CardDescription>
                    Coverage verification accuracy over the past 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-4xl font-bold text-green-600">
                      {coverageReports?.successRate?.toFixed(1) || 0}%
                    </div>
                    <div className="text-muted-foreground">Average success rate</div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      Based on {coverageReports?.totalVerifications || 0} total verifications
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}