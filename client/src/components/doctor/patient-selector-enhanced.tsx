import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Search, User, Calendar, Phone, AlertCircle, CheckCircle, Plus, Upload, FileText, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PatientDataPreview from './patient-data-preview';

interface Patient {
  id: number;
  patientName: string;
  dateOfBirth: string;
  diagnosis: string;
  insuranceInfo: any;
  patientId: string;
  physician: string;
  createdAt: string;
  lastVisit?: string;
  contactPhone?: string;
  emergencyContact?: string;
  primaryDiagnosis?: string;
  medications?: string[];
  allergies?: string[];
  careHistory?: {
    homeHealth: boolean;
    dme: boolean;
    specialists: string[];
  };
}

interface PatientSelectorProps {
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient) => void;
  onNewPatient: () => void;
}

export default function PatientSelectorEnhanced({ selectedPatient, onPatientSelect, onNewPatient }: PatientSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  
  // Upload functionality state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [extractedPatientData, setExtractedPatientData] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients, isLoading } = useQuery({
    queryKey: ['/api/patients', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/patients?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }
      return response.json();
    },
    enabled: true // Always enabled for immediate loading in embedded contexts
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append(`files`, file);
      });
      
      const response = await fetch('/api/patients/upload-documents', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return await response.json();
    },
    onMutate: () => {
      setIsUploading(true);
      setUploadProgress(0);
    },
    onSuccess: (data) => {
      setPreviewData(data);
      
      // If the response contains extracted patient data, show the preview
      if (data.extractedPatients && data.extractedPatients.length > 0) {
        setExtractedPatientData(data.extractedPatients[0]); // Use first extracted patient for preview
        setShowPreview(true);
      } else {
        // Fallback to old behavior if no extracted data
        queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
        toast({
          title: 'Upload Successful',
          description: `Processed ${selectedFiles.length} file(s) successfully`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload files',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type === 'text/csv' || 
                         file.type === 'application/pdf' ||
                         file.name.toLowerCase().endsWith('.csv') ||
                         file.name.toLowerCase().endsWith('.pdf');
      const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB limit
      
      if (!isValidType) {
        toast({
          title: 'Invalid File Type',
          description: `${file.name} is not a supported format. Please use CSV or PDF files.`,
          variant: 'destructive',
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: 'File Too Large',
          description: `${file.name} exceeds the 100MB limit.`,
          variant: 'destructive',
        });
        return false;
      }
      
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'No Files Selected',
        description: 'Please select CSV or PDF files to upload.',
        variant: 'destructive',
      });
      return;
    }
    uploadMutation.mutate(selectedFiles);
  };

  const confirmImport = () => {
    setShowPreview(false);
    setSelectedFiles([]);
    setPreviewData(null);
    
    // Refresh patients list
    queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
    
    toast({
      title: 'Import Completed',
      description: 'Patient data has been successfully imported.',
    });
  };

  // Handler for confirming patient import from preview
  const handleConfirmImport = async (editedData: any) => {
    try {
      const response = await fetch('/api/patients/import-confirmed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ patientData: editedData }),
      });

      if (!response.ok) {
        throw new Error('Failed to import patient data');
      }

      const result = await response.json();
      
      // Select the newly created patient
      if (result.patient) {
        onPatientSelect(result.patient);
      }
      
      setShowPreview(false);
      setExtractedPatientData(null);
      setSelectedFiles([]);
      
      // Refresh patients list and clinical data for auto-population
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/soap-notes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/recent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/ai-recommendations'] });
      
      // Show detailed auto-population results
      const autoPopDetails = result.autoPopulation ? [
        result.autoPopulation.soapNoteGenerated ? '✓ SOAP note generated' : '',
        result.autoPopulation.medicationsExtracted ? '✓ Medications extracted' : '',
        result.autoPopulation.clinicalRecommendations ? '✓ Clinical recommendations ready' : '',
      ].filter(detail => detail).join(', ') : 'Basic patient data populated';
      
      toast({
        title: 'Patient Imported Successfully',
        description: `Patient data imported and auto-populated: ${autoPopDetails}. All relevant areas have been updated.`,
      });

      // Close the dialog
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import patient data',
        variant: 'destructive',
      });
    }
  };

  // Handler for canceling import
  const handleCancelImport = () => {
    setShowPreview(false);
    setExtractedPatientData(null);
    setSelectedFiles([]);
    toast({
      title: 'Import Cancelled',
      description: 'Patient import has been cancelled.',
    });
  };

  // Handler for closing preview
  const handleClosePreview = () => {
    setShowPreview(false);
    setExtractedPatientData(null);
  };

  const filteredPatients = patients?.filter((patient: Patient) => {
    // Backend already handles search filtering, now apply additional client-side filters
    if (filterBy === 'all') return true;
    if (filterBy === 'recent') {
      const lastVisit = patient.lastVisit ? new Date(patient.lastVisit) : new Date(patient.createdAt);
      const daysDiff = (Date.now() - lastVisit.getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 30;
    }
    if (filterBy === 'chronic') {
      return patient.diagnosis && patient.diagnosis.toLowerCase().includes('chronic');
    }
    return true;
  }) || [];

  const handlePatientSelect = (patient: Patient) => {
    onPatientSelect(patient);
    setIsOpen(false);
  };

  if (selectedPatient) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
              <User className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{selectedPatient.patientName}</div>
              <div className="text-sm text-gray-500">
                DOB: {new Date(selectedPatient.dateOfBirth).toLocaleDateString()} | ID: {selectedPatient.patientId}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Primary: {selectedPatient.diagnosis}
              </div>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-green-200 text-green-700 hover:bg-green-100"
              >
                Change Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Patient Selection & Data Management</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="select" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="select">Select Patient</TabsTrigger>
                  <TabsTrigger value="upload">Upload Patient Data</TabsTrigger>
                </TabsList>
                
                {/* Select Patient Tab */}
                <TabsContent value="select" className="space-y-4">
                  {/* Search and Filter Controls */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="search">Search Patients</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="search"
                          placeholder="Search by name, ID, or diagnosis..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    
                    <div className="w-48">
                      <Label htmlFor="filter">Filter By</Label>
                      <Select value={filterBy} onValueChange={setFilterBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter patients" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Patients</SelectItem>
                          <SelectItem value="recent">Recent (30 days)</SelectItem>
                          <SelectItem value="chronic">Chronic Conditions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        onClick={onNewPatient}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        New Patient
                      </Button>
                    </div>
                  </div>

                  {/* Patient List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {isLoading ? (
                      <div className="text-center py-8">
                        <div className="text-sm text-gray-500">Loading patients...</div>
                      </div>
                    ) : filteredPatients.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <div className="text-sm text-gray-500">No patients found</div>
                      </div>
                    ) : (
                      filteredPatients.map((patient: Patient) => (
                        <Card 
                          key={patient.id} 
                          className="cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                                  <User className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium">{patient.patientName}</div>
                                  <div className="text-sm text-gray-500">
                                    ID: {patient.patientId} | DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="mb-1">
                                  {patient.diagnosis}
                                </Badge>
                                <div className="text-xs text-gray-500">
                                  Last visit: {patient.lastVisit ? 
                                    new Date(patient.lastVisit).toLocaleDateString() : 
                                    'Initial visit'
                                  }
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                {/* Upload Patient Data Tab */}
                <TabsContent value="upload" className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="mb-4">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Upload Patient Data</h3>
                      <p className="text-gray-600">
                        Upload CSV files for structured patient data or PDF documents for supporting documentation
                      </p>
                    </div>
                    
                    <div className="mb-4">
                      <input
                        type="file"
                        multiple
                        accept=".csv,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Files
                      </label>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      Supported formats: CSV, PDF • Max size: 100MB per file
                    </div>
                  </div>
                  
                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Selected Files:</h4>
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Upload Button */}
                  {selectedFiles.length > 0 && (
                    <div className="flex justify-center">
                      <Button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Files
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Progress Bar */}
                  {isUploading && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Patient Care History Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <div className="text-sm font-medium text-blue-800">Care History</div>
            <div className="text-xs text-blue-600 mt-1">
              {selectedPatient.careHistory?.homeHealth && <Badge variant="outline" className="mr-1 text-xs">Home Health</Badge>}
              {selectedPatient.careHistory?.dme && <Badge variant="outline" className="mr-1 text-xs">DME</Badge>}
              {selectedPatient.careHistory?.specialists && selectedPatient.careHistory.specialists.length > 0 && (
                <Badge variant="outline" className="text-xs">Specialists ({selectedPatient.careHistory.specialists.length})</Badge>
              )}
            </div>
          </div>
          
          <div className="p-3 bg-purple-50 rounded border border-purple-200">
            <div className="text-sm font-medium text-purple-800">Medications</div>
            <div className="text-xs text-purple-600 mt-1">
              {selectedPatient.medications?.length || 0} active prescriptions
            </div>
          </div>
          
          <div className="p-3 bg-orange-50 rounded border border-orange-200">
            <div className="text-sm font-medium text-orange-800">Allergies</div>
            <div className="text-xs text-orange-600 mt-1">
              {selectedPatient.allergies?.length ? selectedPatient.allergies.join(', ') : 'None documented'}
            </div>
          </div>
        </div>
        
        {/* Preview Modal */}
        {showPreview && previewData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Import Preview</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  The following data will be imported:
                </div>
                
                <div className="bg-gray-50 p-4 rounded border max-h-60 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Cancel
                  </Button>
                  <Button onClick={confirmImport} className="bg-green-600 hover:bg-green-700">
                    Confirm Import
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
      <div className="text-lg font-semibold text-gray-700 mb-2">No Patient Selected</div>
      <div className="text-sm text-gray-500 mb-4">
        Please select a patient before starting documentation or clinical workflows
      </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Search className="h-4 w-4 mr-2" />
            Select Patient
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Selection & Data Management</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="select" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">Select Patient</TabsTrigger>
              <TabsTrigger value="upload">Upload Patient Data</TabsTrigger>
            </TabsList>
            
            {/* Select Patient Tab */}
            <TabsContent value="select" className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Patients</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by name, ID, or diagnosis..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <div className="w-48">
                  <Label htmlFor="filter">Filter By</Label>
                  <Select value={filterBy} onValueChange={setFilterBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter patients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Patients</SelectItem>
                      <SelectItem value="recent">Recent (30 days)</SelectItem>
                      <SelectItem value="chronic">Chronic Conditions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={onNewPatient}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Patient
                  </Button>
                </div>
              </div>

              {/* Patient List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="text-sm text-gray-500">Loading patients...</div>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-500">No patients found</div>
                  </div>
                ) : (
                  filteredPatients.map((patient: Patient) => (
                    <Card 
                      key={patient.id} 
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => handlePatientSelect(patient)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{patient.patientName}</div>
                              <div className="text-sm text-gray-500">
                                ID: {patient.patientId} | DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="mb-1">
                              {patient.diagnosis}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              Last visit: {patient.lastVisit ? 
                                new Date(patient.lastVisit).toLocaleDateString() : 
                                'Initial visit'
                              }
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
            
            {/* Upload Patient Data Tab */}
            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="mb-4">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Upload Patient Data</h3>
                  <p className="text-gray-600">
                    Upload CSV files for structured patient data or PDF documents for supporting documentation
                  </p>
                </div>
                
                <div className="mb-4">
                  <input
                    type="file"
                    multiple
                    accept=".csv,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload-no-patient"
                  />
                  <label
                    htmlFor="file-upload-no-patient"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </label>
                </div>
                
                <div className="text-sm text-gray-500">
                  Supported formats: CSV, PDF • Max size: 100MB per file
                </div>
              </div>
              
              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Selected Files:</h4>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload Button */}
              {selectedFiles.length > 0 && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* Progress Bar */}
              {isUploading && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Import Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                The following data will be imported:
              </div>
              
              <div className="bg-gray-50 p-4 rounded border max-h-60 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(previewData, null, 2)}
                </pre>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cancel
                </Button>
                <Button onClick={confirmImport} className="bg-green-600 hover:bg-green-700">
                  Confirm Import
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Data Preview Modal */}
      {extractedPatientData && (
        <PatientDataPreview
          extractedData={extractedPatientData}
          isOpen={showPreview}
          onClose={handleClosePreview}
          onConfirmImport={handleConfirmImport}
          onCancel={handleCancelImport}
        />
      )}
    </div>
  );
}