import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Upload, Brain, AlertTriangle, CheckCircle, File, X } from "lucide-react";

export default function AIReferralSummary() {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryForm, setSummaryForm] = useState({
    referralId: "",
    referralDocuments: ""
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      const response = await fetch('/api/ai/referral-summary/upload-files', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setProcessedFiles(prev => [...prev, ...data.uploadedFiles]);
      toast({
        title: "Files uploaded successfully",
        description: `${data.uploadedFiles.length} file(s) processed for AI analysis`,
      });
      setIsUploading(false);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async (data: typeof summaryForm) => {
      return await apiRequest('/api/ai/referral-summary/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setSummaryData(data);
      toast({
        title: "Summary generated successfully",
        description: "AI analysis complete with comprehensive clinical overview",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate summary",
        variant: "destructive",
      });
    }
  });

  const handleGenerateSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summaryForm.referralId && processedFiles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a referral ID or upload documents for analysis",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare data for generation
    const generationData = {
      ...summaryForm,
      referralId: summaryForm.referralId || `upload-${Date.now()}`, // Generate ID if none provided
      uploadedFiles: processedFiles.map(file => file.filename)
    };
    
    generateSummaryMutation.mutate(generationData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setIsUploading(true);
      setUploadedFiles(prev => [...prev, ...files]);
      uploadFilesMutation.mutate(files);
    }
  };

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
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setIsUploading(true);
      setUploadedFiles(prev => [...prev, ...files]);
      uploadFilesMutation.mutate(files);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          AI Referral Summary Generator
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Intelligent clinical overview with comprehensive risk stratification analysis
        </p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate">Generate Summary</TabsTrigger>
          <TabsTrigger value="clinical">Clinical Overview</TabsTrigger>
          <TabsTrigger value="risk">Risk Stratification</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Referral Document Processing
              </CardTitle>
              <CardDescription>
                Generate comprehensive clinical summaries from referral packets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateSummary} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="referralId">Referral ID</Label>
                  <Input
                    id="referralId"
                    placeholder="Enter referral ID"
                    value={summaryForm.referralId}
                    onChange={(e) => setSummaryForm(prev => ({ ...prev, referralId: e.target.value }))}
                    required
                  />
                </div>

                {/* Enhanced File Upload Section */}
                <div className="space-y-4">
                  <Label>Upload Referral Documents (All Medical Formats Supported)</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                      isDragOver 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' 
                        : 'border-gray-300 hover:border-indigo-400'
                    } ${isUploading ? 'opacity-75' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.tiff,.dicom,.hl7,.csv,.xlsx,.xls,.rtf,.xml,.json,.fhir"
                      className="hidden"
                      id="file-upload"
                      disabled={isUploading}
                    />
                    <label htmlFor="file-upload" className={`cursor-pointer ${isUploading ? 'pointer-events-none' : ''}`}>
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                          <p className="mt-2 text-sm text-indigo-600">Processing files with AI...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {isDragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            PDF, DOC, DOCX, Images, DICOM, HL7, FHIR, CSV, XML, JSON
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Uploaded Files Display */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">Uploaded Files ({uploadedFiles.length})</Label>
                      <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <File className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown type'}
                                </p>
                              </div>
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
                    </div>
                  )}

                  {/* AI Processing Status */}
                  {processedFiles.length > 0 && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          AI Analysis Complete: {processedFiles.length} file(s) processed
                        </p>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                        Files have been analyzed using advanced Generative AI for comprehensive medical data extraction
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-200 mt-2 font-medium">
                        📋 Ready for Summary Generation → Click "Generate AI Summary from Documents" below
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referralDocuments">Additional Notes (Optional)</Label>
                  <Textarea
                    id="referralDocuments"
                    placeholder="Enter any additional clinical notes or context"
                    value={summaryForm.referralDocuments}
                    onChange={(e) => setSummaryForm(prev => ({ ...prev, referralDocuments: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={generateSummaryMutation.isPending || (!summaryForm.referralId && processedFiles.length === 0)}
                  className="w-full"
                >
                  {generateSummaryMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating AI Summary...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      {processedFiles.length > 0 ? 'Generate AI Summary from Documents' : 'Generate AI Summary'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Clinical Overview
              </CardTitle>
              <CardDescription>
                Comprehensive clinical analysis from AI-processed referral documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaryData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Patient Overview</h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          {summaryData.clinicalOverview || 'No clinical overview available'}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Risk Level</h3>
                        <Badge 
                          variant={
                            summaryData.riskLevel === 'critical' ? 'destructive' :
                            summaryData.riskLevel === 'high' ? 'secondary' :
                            summaryData.riskLevel === 'medium' ? 'outline' : 'default'
                          }
                          className="text-sm"
                        >
                          {summaryData.riskLevel?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Symptoms</h3>
                        <div className="space-y-1">
                          {summaryData.symptoms && summaryData.symptoms.length > 0 ? (
                            summaryData.symptoms.map((symptom: string, index: number) => (
                              <Badge key={index} variant="outline" className="mr-2 mb-1">
                                {symptom}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-gray-500">No symptoms identified</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Conditions</h3>
                        <div className="space-y-1">
                          {summaryData.conditions && summaryData.conditions.length > 0 ? (
                            summaryData.conditions.map((condition: string, index: number) => (
                              <Badge key={index} variant="secondary" className="mr-2 mb-1">
                                {condition}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-gray-500">No conditions identified</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No Summary Generated</h3>
                  <p className="mt-1 text-sm text-gray-500">Generate a summary first to view clinical overview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk Stratification
              </CardTitle>
              <CardDescription>
                AI-powered risk assessment and care prioritization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaryData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {summaryData.triageScore || 0}/10
                        </div>
                        <p className="text-sm text-gray-600">Triage Score</p>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {summaryData.riskLevel || 'Unknown'}
                        </div>
                        <p className="text-sm text-gray-600">Risk Level</p>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-600">
                          {summaryData.urgencyPrediction || 'Unknown'}
                        </div>
                        <p className="text-sm text-gray-600">Urgency</p>
                      </div>
                    </Card>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Next Best Actions</h3>
                    <div className="space-y-2">
                      {summaryData.nextBestActions && summaryData.nextBestActions.length > 0 ? (
                        summaryData.nextBestActions.map((action: string, index: number) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                            <span className="text-sm">{action}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500">No specific actions recommended</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No Risk Assessment</h3>
                  <p className="mt-1 text-sm text-gray-500">Generate a summary first to view risk stratification</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Insights
              </CardTitle>
              <CardDescription>
                Advanced analytics and recommendations from Generative AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaryData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">AI Analysis Summary</h3>
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 p-4 rounded-lg">
                        <p className="text-sm leading-relaxed">
                          {summaryData.aiAnalysisSummary || 'Comprehensive AI analysis reveals key clinical indicators and care coordination opportunities based on referral documentation.'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Care Recommendations</h3>
                      <div className="space-y-2">
                        {summaryData.careRecommendations && summaryData.careRecommendations.length > 0 ? (
                          summaryData.careRecommendations.map((recommendation: string, index: number) => (
                            <div key={index} className="flex items-start space-x-2 text-sm">
                              <span className="text-indigo-500 font-semibold">•</span>
                              <span>{recommendation}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="flex items-start space-x-2 text-sm">
                              <span className="text-indigo-500 font-semibold">•</span>
                              <span>Schedule comprehensive initial assessment</span>
                            </div>
                            <div className="flex items-start space-x-2 text-sm">
                              <span className="text-indigo-500 font-semibold">•</span>
                              <span>Coordinate with primary care physician</span>
                            </div>
                            <div className="flex items-start space-x-2 text-sm">
                              <span className="text-indigo-500 font-semibold">•</span>
                              <span>Review medication interactions</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Processing Details</h3>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">Generated</p>
                          <p className="text-gray-600 dark:text-gray-400">
                            {summaryData.createdAt ? new Date(summaryData.createdAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">AI Model</p>
                          <p className="text-gray-600 dark:text-gray-400">Claude Sonnet 4</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">Documents</p>
                          <p className="text-gray-600 dark:text-gray-400">{processedFiles.length} processed</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">Status</p>
                          <p className="text-green-600">Complete</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No AI Insights Available</h3>
                  <p className="mt-1 text-sm text-gray-500">Generate a summary first to view AI insights and recommendations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}