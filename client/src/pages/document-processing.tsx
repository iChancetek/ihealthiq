import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  Eye, 
  Mail, 
  Send, 
  Download, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Brain,
  Shield,
  Activity,
  FileCheck,
  Search,
  Filter,
  Archive
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessedDocument {
  id: number;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  processedAt: string | null;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  aiProcessing: {
    extractedText: string;
    documentType: string;
    confidence: number;
    summary: string;
    keyData: any;
    medicalInfo?: any;
    complianceFlags: string[];
  } | null;
  securityScan: {
    passed: boolean;
    threats: string[];
    hipaaCompliant: boolean;
  };
  auditTrail: {
    uploadedBy: number;
    actions: {
      action: string;
      timestamp: string;
      userId: number;
      details: string;
    }[];
  };
}

interface EmailDialogProps {
  document: ProcessedDocument;
  isOpen: boolean;
  onClose: () => void;
}

interface EFaxDialogProps {
  document: ProcessedDocument;
  isOpen: boolean;
  onClose: () => void;
}

function EmailDialog({ document, isOpen, onClose }: EmailDialogProps) {
  const [emailData, setEmailData] = useState({
    to: '',
    cc: '',
    subject: `Document: ${document?.filename || 'Healthcare Document'}`,
    message: 'Please find the attached healthcare document for your review.',
    includeAiSummary: true,
    encryptAttachment: true
  });
  const { toast } = useToast();

  const sendEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/documents/${document.id}/email`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Email Sent Successfully",
        description: "Document has been securely sent via email with HIPAA compliance.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSend = () => {
    if (!emailData.to.trim()) {
      toast({
        title: "Missing Recipient",
        description: "Please enter recipient email address.",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate(emailData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Send Document via Email
          </DialogTitle>
          <DialogDescription>
            Send {document?.filename} securely with HIPAA compliance
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email-to">To (Required)</Label>
            <Input
              id="email-to"
              type="email"
              placeholder="recipient@healthcare.com"
              value={emailData.to}
              onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email-cc">CC (Optional)</Label>
            <Input
              id="email-cc"
              type="email"
              placeholder="cc@healthcare.com"
              value={emailData.cc}
              onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={emailData.subject}
              onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email-message">Message</Label>
            <Textarea
              id="email-message"
              rows={4}
              value={emailData.message}
              onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="include-summary"
              checked={emailData.includeAiSummary}
              onChange={(e) => setEmailData(prev => ({ ...prev, includeAiSummary: e.target.checked }))}
            />
            <Label htmlFor="include-summary">Include AI-generated summary</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="encrypt-attachment"
              checked={emailData.encryptAttachment}
              onChange={(e) => setEmailData(prev => ({ ...prev, encryptAttachment: e.target.checked }))}
            />
            <Label htmlFor="encrypt-attachment">Encrypt attachment (HIPAA Required)</Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend}
            disabled={sendEmailMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sendEmailMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EFaxDialog({ document, isOpen, onClose }: EFaxDialogProps) {
  const [faxData, setFaxData] = useState({
    recipientNumber: '',
    recipientName: '',
    coverPage: true,
    coverMessage: 'Healthcare document transmission - CONFIDENTIAL',
    priority: 'normal' as 'normal' | 'high' | 'urgent'
  });
  const { toast } = useToast();

  const sendFaxMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/documents/${document.id}/efax`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (response: any) => {
      toast({
        title: "eFax Sent Successfully",
        description: `Fax ID: ${response.faxId}. Delivery confirmation will be tracked.`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "eFax Failed",
        description: error.message || "Failed to send fax. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSend = () => {
    if (!faxData.recipientNumber.trim()) {
      toast({
        title: "Missing Fax Number",
        description: "Please enter recipient fax number.",
        variant: "destructive",
      });
      return;
    }
    sendFaxMutation.mutate(faxData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Send Document via eFax
          </DialogTitle>
          <DialogDescription>
            Transmit {document?.filename} via secure eFax with delivery tracking
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="fax-number">Recipient Fax Number (Required)</Label>
            <Input
              id="fax-number"
              type="tel"
              placeholder="+1-555-123-4567"
              value={faxData.recipientNumber}
              onChange={(e) => setFaxData(prev => ({ ...prev, recipientNumber: e.target.value }))}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="fax-name">Recipient Name</Label>
            <Input
              id="fax-name"
              placeholder="Dr. John Smith"
              value={faxData.recipientName}
              onChange={(e) => setFaxData(prev => ({ ...prev, recipientName: e.target.value }))}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="fax-priority">Priority Level</Label>
            <Select 
              value={faxData.priority} 
              onValueChange={(value: 'normal' | 'high' | 'urgent') => 
                setFaxData(prev => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="cover-message">Cover Page Message</Label>
            <Textarea
              id="cover-message"
              rows={3}
              value={faxData.coverMessage}
              onChange={(e) => setFaxData(prev => ({ ...prev, coverMessage: e.target.value }))}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="cover-page"
              checked={faxData.coverPage}
              onChange={(e) => setFaxData(prev => ({ ...prev, coverPage: e.target.checked }))}
            />
            <Label htmlFor="cover-page">Include cover page</Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend}
            disabled={sendFaxMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {sendFaxMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send eFax
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentProcessing() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; document: ProcessedDocument | null }>({
    isOpen: false,
    document: null
  });
  const [emailDialog, setEmailDialog] = useState<{ isOpen: boolean; document: ProcessedDocument | null }>({
    isOpen: false,
    document: null
  });
  const [efaxDialog, setEfaxDialog] = useState<{ isOpen: boolean; document: ProcessedDocument | null }>({
    isOpen: false,
    document: null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<ProcessedDocument[]>({
    queryKey: ['/api/documents'],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`files`, file);
      });
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return await response.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Upload Successful",
        description: `${response.uploadedFiles.length} document(s) uploaded and processing started.`,
      });
      setSelectedFiles([]);
      setUploadProgress({});
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload documents. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return await apiRequest(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Document Deleted",
        description: "Document has been moved to recycle area.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setDeleteConfirmation({ isOpen: false, document: null });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete document.",
        variant: "destructive",
      });
    }
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async ({ documentId, format }: { documentId: number; format: string }) => {
      const response = await fetch(`/api/documents/${documentId}/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'document';
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Document has been downloaded to your device.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export document.",
        variant: "destructive",
      });
    }
  });

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'image/jpeg',
        'image/png',
        'image/tiff',
        'text/plain'
      ];
      return allowedTypes.includes(file.type) && file.size <= 100 * 1024 * 1024; // 100MB limit
    });
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Some files were rejected. Only PDF, DOCX, DOC, JPG, PNG, TIFF, and TXT files up to 100MB are allowed.",
        variant: "destructive",
      });
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'image/jpeg',
        'image/png',
        'image/tiff',
        'text/plain'
      ];
      return allowedTypes.includes(file.type) && file.size <= 100 * 1024 * 1024;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files to upload.",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate(selectedFiles);
  };

  const getFileIcon = (fileType: string | undefined) => {
    if (!fileType) return <File className="w-5 h-5" />;
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-600" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="w-5 h-5 text-blue-600" />;
    return <File className="w-5 h-5" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      uploading: { color: 'bg-blue-100 text-blue-800', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
      processing: { color: 'bg-yellow-100 text-yellow-800', icon: <Brain className="w-3 h-3" /> },
      completed: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      failed: { color: 'bg-red-100 text-red-800', icon: <AlertCircle className="w-3 h-3" /> }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.failed;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter((doc: ProcessedDocument) => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.originalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || doc.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Processing</h1>
          <p className="text-gray-600 mt-1">AI-powered multi-format document processing with secure handling</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            HIPAA Compliant
          </Badge>
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <Brain className="w-3 h-3" />
            AI Processing
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Process</TabsTrigger>
          <TabsTrigger value="documents">Document Library</TabsTrigger>
          <TabsTrigger value="analytics">Processing Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Multi-Format Document Upload
              </CardTitle>
              <CardDescription>
                Drag and drop or select documents for AI processing. Supported formats: PDF, DOCX, DOC, JPG, PNG, TIFF, TXT
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => e.preventDefault()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="mb-4">
                  <p className="text-lg font-medium text-gray-900">Drop files here or click to upload</p>
                  <p className="text-sm text-gray-500">Maximum file size: 50MB per file</p>
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.tiff,.txt"
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Select Files
                  </Button>
                </label>
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Selected Files ({selectedFiles.length})</h3>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file.type)}
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      onClick={handleUpload}
                      disabled={uploadMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload & Process ({selectedFiles.length} files)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="uploading">Uploading</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Documents Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-gray-200 rounded flex-1"></div>
                      <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredDocuments.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-500">Upload documents to get started with AI processing.</p>
              </div>
            ) : (
              filteredDocuments.map((document: ProcessedDocument) => (
                <Card key={document.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(document.fileType)}
                        <div className="min-w-0">
                          <p className="font-medium truncate" title={document.originalName}>
                            {document.originalName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(document.fileSize)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(document.status)}
                    </div>

                    {/* AI Processing Results */}
                    {document.aiProcessing && (
                      <div className="mb-3 p-2 bg-blue-50 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <Brain className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            AI Analysis ({Math.round(document.aiProcessing.confidence * 100)}% confidence)
                          </span>
                        </div>
                        <p className="text-xs text-blue-700">
                          Type: {document.aiProcessing.documentType}
                        </p>
                        {document.aiProcessing.summary && (
                          <p className="text-xs text-blue-700 mt-1 line-clamp-2">
                            {document.aiProcessing.summary}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Security Status */}
                    <div className="mb-3 flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${document.securityScan?.hipaaCompliant ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={`text-xs ${document.securityScan?.hipaaCompliant ? 'text-green-700' : 'text-red-700'}`}>
                        {document.securityScan?.hipaaCompliant ? 'HIPAA Compliant' : 'Compliance Issues'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDocument(document)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                      
                      <div className="relative group">
                        <Button variant="outline" size="sm" className="w-full">
                          <Download className="w-3 h-3 mr-1" />
                          Export
                        </Button>
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-white border rounded shadow-lg p-2 z-50">
                          <div className="space-y-1">
                            <button
                              onClick={() => exportMutation.mutate({ documentId: document.id, format: 'original' })}
                              className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 rounded"
                            >
                              Original File
                            </button>
                            <button
                              onClick={() => exportMutation.mutate({ documentId: document.id, format: 'annotated' })}
                              className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 rounded"
                            >
                              AI Annotated
                            </button>
                            <button
                              onClick={() => exportMutation.mutate({ documentId: document.id, format: 'summary' })}
                              className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 rounded"
                            >
                              Summary Report
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEmailDialog({ isOpen: true, document })}
                        className="flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        Email
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEfaxDialog({ isOpen: true, document })}
                        className="flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        eFax
                      </Button>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmation({ isOpen: true, document })}
                        className="w-full text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Documents</p>
                    <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Processing</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {documents.filter((d: ProcessedDocument) => d.status === 'processing').length}
                    </p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {documents.filter((d: ProcessedDocument) => d.status === 'completed').length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">HIPAA Compliant</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {documents.filter((d: ProcessedDocument) => d.securityScan?.hipaaCompliant).length}
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Email Dialog */}
      {emailDialog.document && (
        <EmailDialog
          document={emailDialog.document}
          isOpen={emailDialog.isOpen}
          onClose={() => setEmailDialog({ isOpen: false, document: null })}
        />
      )}

      {/* eFax Dialog */}
      {efaxDialog.document && (
        <EFaxDialog
          document={efaxDialog.document}
          isOpen={efaxDialog.isOpen}
          onClose={() => setEfaxDialog({ isOpen: false, document: null })}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirmation.document && (
        <ConfirmationDialog
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ isOpen: false, document: null })}
          onConfirm={() => deleteMutation.mutate(deleteConfirmation.document!.id)}
          title="Delete Document"
          description={`Are you sure you want to delete "${deleteConfirmation.document.originalName}"? This will move it to the recycle area where it can be restored.`}
          confirmText="Delete"
          type="delete"
          itemName={deleteConfirmation.document.originalName}
        />
      )}
    </div>
  );
}