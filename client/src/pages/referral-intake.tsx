import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, User, Eye, AlertCircle, Calendar, Stethoscope, MapPin, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ReferralIntake() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['/api/referrals'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      return await apiRequest('/api/referrals/upload', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Document processed successfully",
        description: `OCR processing completed with ${Math.round(data.ocrResult.confidence * 100)}% confidence`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/referrals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-referrals'] });
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 100MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const getStatusColor = (status: string, ocrStatus?: string) => {
    if (ocrStatus === 'complete' && status === 'complete') return 'bg-green-100 text-green-800';
    if (status === 'processing') return 'bg-yellow-100 text-yellow-800';
    if (status === 'missing_info') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string, ocrStatus?: string) => {
    if (ocrStatus === 'complete' && status === 'complete') return 'Complete';
    if (status === 'processing') return 'Processing';
    if (status === 'missing_info') return 'Missing Info';
    return 'Pending';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Document Upload & OCR Processing</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="document-upload">Select Referral Document</Label>
              <Input
                id="document-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: PDF, JPG, PNG (max 10MB)
              </p>
            </div>
            
            {selectedFile && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">{selectedFile.name}</p>
                    <p className="text-sm text-blue-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {uploadMutation.isPending ? 'Processing...' : 'Process Document'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Referrals List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Referral Queue</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading referrals...</p>
            </div>
          ) : referrals && referrals.length > 0 ? (
            <div className="space-y-4">
              {referrals.map((referral: any) => (
                <div key={referral.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {referral.extractedData?.patientName || 'Patient Name Not Extracted'}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">DOB:</span>{' '}
                            {referral.extractedData?.dateOfBirth || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Diagnosis:</span>{' '}
                            {referral.extractedData?.diagnosis || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Physician:</span>{' '}
                            {referral.extractedData?.physician || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Referral Date:</span>{' '}
                            {new Date(referral.referralDate).toLocaleDateString()}
                          </div>
                        </div>
                        
                        {referral.missingFields && referral.missingFields.length > 0 && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-medium text-red-800">Missing Information:</span>
                            </div>
                            <p className="text-sm text-red-700 mt-1">
                              {referral.missingFields.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge
                        className={getStatusColor(referral.status, referral.ocrStatus)}
                        variant="secondary"
                      >
                        {referral.status === 'processing' && (
                          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse mr-1" />
                        )}
                        {getStatusText(referral.status, referral.ocrStatus)}
                      </Badge>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center space-x-2">
                                <User className="w-5 h-5" />
                                <span>Referral Details - {referral.extractedData?.patientName || 'Unknown Patient'}</span>
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[70vh] pr-4">
                              <div className="space-y-6">
                                {/* Patient Information */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                      <User className="w-4 h-4" />
                                      <span>Patient Information</span>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                                        <p className="text-sm">{referral.extractedData?.patientName || 'Not provided'}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium text-gray-600">Date of Birth</Label>
                                        <p className="text-sm">{referral.extractedData?.dateOfBirth || 'Not provided'}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium text-gray-600">Phone Number</Label>
                                        <p className="text-sm">{referral.extractedData?.phoneNumber || 'Not provided'}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium text-gray-600">Insurance</Label>
                                        <p className="text-sm">{referral.extractedData?.insurance || 'Not provided'}</p>
                                      </div>
                                    </div>
                                    
                                    {referral.extractedData?.address && (
                                      <div className="mt-4">
                                        <Label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                                          <MapPin className="w-3 h-3" />
                                          <span>Address</span>
                                        </Label>
                                        <p className="text-sm">{referral.extractedData.address}</p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Medical Information */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                      <Stethoscope className="w-4 h-4" />
                                      <span>Medical Information</span>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-sm font-medium text-gray-600">Primary Diagnosis</Label>
                                        <p className="text-sm">{referral.extractedData?.diagnosis || 'Not provided'}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium text-gray-600">Referring Physician</Label>
                                        <p className="text-sm">{referral.extractedData?.physician || 'Not provided'}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium text-gray-600">Service Type</Label>
                                        <p className="text-sm">{referral.extractedData?.serviceType || 'Not specified'}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                                          <Calendar className="w-3 h-3" />
                                          <span>Referral Date</span>
                                        </Label>
                                        <p className="text-sm">{new Date(referral.referralDate).toLocaleDateString()}</p>
                                      </div>
                                    </div>
                                    
                                    {referral.extractedData?.medications && (
                                      <div className="mt-4">
                                        <Label className="text-sm font-medium text-gray-600">Current Medications</Label>
                                        <p className="text-sm">{referral.extractedData.medications}</p>
                                      </div>
                                    )}
                                    
                                    {referral.extractedData?.medicalHistory && (
                                      <div className="mt-4">
                                        <Label className="text-sm font-medium text-gray-600">Medical History</Label>
                                        <p className="text-sm">{referral.extractedData.medicalHistory}</p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Processing Status */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                      <FileText className="w-4 h-4" />
                                      <span>Processing Status</span>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Current Status:</span>
                                        <Badge className={getStatusColor(referral.status, referral.ocrStatus)} variant="secondary">
                                          {getStatusText(referral.status, referral.ocrStatus)}
                                        </Badge>
                                      </div>
                                      
                                      {referral.ocrResult && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium">OCR Confidence:</span>
                                          <span className="text-sm">{Math.round(referral.ocrResult.confidence * 100)}%</span>
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Created:</span>
                                        <span className="text-sm">{new Date(referral.createdAt).toLocaleString()}</span>
                                      </div>
                                      
                                      {referral.updatedAt && referral.updatedAt !== referral.createdAt && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium">Last Updated:</span>
                                          <span className="text-sm">{new Date(referral.updatedAt).toLocaleString()}</span>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Missing Information */}
                                {referral.missingFields && referral.missingFields.length > 0 && (
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center space-x-2 text-red-600">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>Missing Information</span>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-2">
                                        {referral.missingFields.map((field: string, index: number) => (
                                          <div key={index} className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <span className="text-sm text-red-700">{field}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Raw OCR Data */}
                                {referral.ocrResult && (
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center space-x-2">
                                        <FileText className="w-4 h-4" />
                                        <span>OCR Raw Text</span>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="bg-gray-50 p-3 rounded-lg">
                                        <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                          {referral.ocrResult.extractedText || 'No raw text available'}
                                        </pre>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Process
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Referrals Found</h3>
              <p className="text-gray-500">Upload your first referral document to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
