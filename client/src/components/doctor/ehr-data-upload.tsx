import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Database, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  recordsProcessed?: number;
  errors?: string[];
}

interface EHRDataUploadProps {
  selectedPatient?: any;
}

export default function EHRDataUpload({ selectedPatient }: EHRDataUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedDataType, setSelectedDataType] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Supported data types and their formats
  const dataTypes = [
    { value: 'patient-demographics', label: 'Patient Demographics', formats: ['CSV', 'PDF'] },
    { value: 'medication-history', label: 'Medication History', formats: ['CSV', 'PDF'] },
    { value: 'lab-results', label: 'Laboratory Results', formats: ['CSV', 'PDF'] },
    { value: 'visit-notes', label: 'Visit Notes & SOAP', formats: ['PDF', 'CSV'] },
    { value: 'referral-history', label: 'Referral History', formats: ['CSV', 'PDF'] },
    { value: 'insurance-info', label: 'Insurance Information', formats: ['CSV', 'PDF'] },
    { value: 'care-plans', label: 'Care Plans', formats: ['PDF', 'CSV'] },
    { value: 'diagnostic-images', label: 'Diagnostic Reports', formats: ['PDF'] }
  ];

  // Upload and process files
  const uploadMutation = useMutation({
    mutationFn: async ({ files, dataType }: { files: FileList; dataType: string }) => {
      const formData = new FormData();
      
      Array.from(files).forEach((file, index) => {
        formData.append(`files`, file);
      });
      formData.append('dataType', dataType);
      formData.append('patientId', selectedPatient?.id || '');

      const response = await fetch('/api/doctor/ehr-upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `${data.processedCount} records imported successfully`
      });
      
      // Update file statuses
      setUploadedFiles(prev => prev.map(file => ({
        ...file,
        status: 'completed',
        progress: 100,
        recordsProcessed: data.recordsProcessed || 0
      })));

      // Refresh relevant data
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/referral-history'] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
      
      setUploadedFiles(prev => prev.map(file => ({
        ...file,
        status: 'failed',
        errors: [error.message]
      })));
    }
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && selectedDataType) {
      processFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && selectedDataType) {
      processFiles(files);
    }
  };

  const processFiles = (files: FileList) => {
    if (!selectedDataType) {
      toast({
        title: "Data Type Required",
        description: "Please select a data type before uploading files",
        variant: "destructive"
      });
      return;
    }

    // Validate file types and sizes
    const allowedTypes = ['text/csv', 'application/pdf', 'application/vnd.ms-excel'];
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    
    const invalidFiles = Array.from(files).filter(file => 
      !allowedTypes.includes(file.type) && 
      !file.name.toLowerCase().endsWith('.csv') &&
      !file.name.toLowerCase().endsWith('.pdf')
    );

    const oversizedFiles = Array.from(files).filter(file => file.size > maxFileSize);

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid File Type",
        description: "Only CSV and PDF files are supported",
        variant: "destructive"
      });
      return;
    }

    if (oversizedFiles.length > 0) {
      toast({
        title: "File Too Large",
        description: `Files must be smaller than 100MB. ${oversizedFiles[0].name} is too large.`,
        variant: "destructive"
      });
      return;
    }

    // Add files to upload queue
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Start upload process
    uploadMutation.mutate({ files, dataType: selectedDataType });

    // Simulate progress for UI feedback
    newFiles.forEach((_, index) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 90) {
          clearInterval(interval);
          progress = 90; // Keep at 90% until actual completion
        }
        
        setUploadedFiles(prev => prev.map((file, i) => 
          i >= prev.length - newFiles.length + index ? 
            { ...file, status: 'processing', progress: Math.min(progress, 90) } : file
        ));
      }, 500);
    });
  };

  const clearCompletedFiles = () => {
    setUploadedFiles(prev => prev.filter(file => file.status !== 'completed'));
  };

  const selectedDataTypeInfo = dataTypes.find(dt => dt.value === selectedDataType);

  return (
    <div className="space-y-6">
      {/* Data Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            EHR Data Upload
          </CardTitle>
          <CardDescription>
            Upload patient data from your EHR system in CSV or PDF format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataType">Data Type *</Label>
            <Select value={selectedDataType} onValueChange={setSelectedDataType}>
              <SelectTrigger>
                <SelectValue placeholder="Select the type of data you're uploading" />
              </SelectTrigger>
              <SelectContent>
                {dataTypes.map(dataType => (
                  <SelectItem key={dataType.value} value={dataType.value}>
                    {dataType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDataTypeInfo && (
              <div className="flex gap-2 mt-2">
                <span className="text-sm text-gray-600">Supported formats:</span>
                {selectedDataTypeInfo.formats.map(format => (
                  <Badge key={format} variant="outline" className="text-xs">
                    {format}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {selectedPatient && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Target Patient: {selectedPatient.patientName}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Data will be associated with this patient's record
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <Card>
        <CardContent className="pt-6">
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
              ${selectedDataType ? 'cursor-pointer hover:border-blue-400' : 'cursor-not-allowed opacity-50'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Upload EHR Data Files</h3>
            <p className="text-gray-600 mb-4">
              Drag and drop files here, or click to browse
            </p>
            <Input
              type="file"
              multiple
              accept=".csv,.pdf"
              onChange={handleFileSelect}
              disabled={!selectedDataType}
              className="hidden"
              id="file-upload"
            />
            <Button 
              asChild 
              disabled={!selectedDataType}
              variant={selectedDataType ? "default" : "secondary"}
            >
              <label htmlFor="file-upload" className="cursor-pointer">
                Browse Files
              </label>
            </Button>
            {!selectedDataType && (
              <p className="text-sm text-red-600 mt-2">
                Please select a data type first
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upload Progress</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearCompletedFiles}
              disabled={!uploadedFiles.some(f => f.status === 'completed')}
            >
              Clear Completed
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{file.name}</span>
                      <Badge variant={
                        file.status === 'completed' ? 'default' :
                        file.status === 'failed' ? 'destructive' :
                        file.status === 'processing' ? 'secondary' : 'outline'
                      }>
                        {file.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {file.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {file.status === 'processing' && <Clock className="h-3 w-3 mr-1" />}
                        {file.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  
                  {file.status !== 'pending' && (
                    <Progress value={file.progress} className="mb-2" />
                  )}
                  
                  {file.recordsProcessed && (
                    <p className="text-sm text-green-600">
                      ✓ {file.recordsProcessed} records processed successfully
                    </p>
                  )}
                  
                  {file.errors && file.errors.length > 0 && (
                    <div className="text-sm text-red-600">
                      {file.errors.map((error, i) => (
                        <p key={i}>✗ {error}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Mapping Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Data Format Guidelines</CardTitle>
          <CardDescription>
            Ensure your EHR exports follow these formats for optimal processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">CSV Format Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Include column headers in first row</li>
                <li>• Use standard date format (YYYY-MM-DD)</li>
                <li>• Patient ID should be consistent across files</li>
                <li>• Medication names should include strength</li>
                <li>• UTF-8 encoding recommended</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">PDF Processing Notes</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• OCR will extract text from scanned documents</li>
                <li>• Structured reports process better than handwritten notes</li>
                <li>• Patient identifiers should be clearly visible</li>
                <li>• Lab results with standard formatting preferred</li>
                <li>• Maximum file size: 50MB per PDF</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}