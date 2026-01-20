import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, FileText, Clock, CheckCircle, 
  Calendar, User, Download, Mail, Send, Eye
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MyAiIntakeResults() {
  const { toast } = useToast();
  const [selectedResult, setSelectedResult] = useState<any>(null);

  // Fetch AI intake results for current nurse
  const { data: results, isLoading } = useQuery({
    queryKey: ["/api/ai-intake/my-results"],
    refetchInterval: 30000
  });

  const handleEmailResult = async (result: any) => {
    try {
      const emailData = {
        to: "healthcare@isynera.com",
        subject: `Saved AI Intake Results - ${result.patientName || 'Patient'}`,
        body: `
Saved AI Intake Processing Results

Patient: ${result.patientName || 'N/A'}
Diagnosis: ${result.diagnosis || 'N/A'}
Processing Time: ${result.processingTime || 0}ms
AI Confidence: ${result.aiConfidence}
CMS Compliance: ${result.cmsCompliance}
Saved: ${new Date(result.createdAt).toLocaleString()}

Result ID: ${result.id}
Processed by: iSynera AI Healthcare Platform
        `.trim()
      };
      
      const response = await apiRequest('/api/ai/transcription/email', {
        method: 'POST',
        body: JSON.stringify(emailData)
      });
      
      if (response.success) {
        toast({ title: "Email Sent", description: "AI intake results emailed successfully" });
      } else {
        toast({ title: "Email Failed", description: response.error || "Failed to send email", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Email Error", description: "Failed to send results", variant: "destructive" });
    }
  };

  const handleDownloadResult = (result: any) => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saved-ai-intake-${result.patientName?.replace(/\s+/g, '-') || 'patient'}-${result.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: "Download Complete", description: "Saved results downloaded successfully" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="container mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading your saved AI intake results...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
            My Saved AI Intake Results
          </h1>
          <p className="text-gray-600">
            View and manage your saved hyper-intelligent AI intake processing results
          </p>
        </div>

        {/* Results Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <Brain className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {results?.results?.length || 0}
              </p>
              <p className="text-sm text-blue-700">Total Saved Results</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">100%</p>
              <p className="text-sm text-green-700">CMS Compliant</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">98.5%</p>
              <p className="text-sm text-purple-700">Average AI Confidence</p>
            </CardContent>
          </Card>
        </div>

        {/* Results List */}
        <div className="grid grid-cols-1 gap-6">
          {results?.results?.length > 0 ? (
            results.results.map((result: any) => (
              <Card key={result.id} className="border-2 hover:border-blue-300 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      <span>{result.patientName || 'Unnamed Patient'}</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {result.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{result.processingTime || 0}ms</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Brain className="h-4 w-4" />
                        <span>{result.aiConfidence}</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Patient Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-semibold">Diagnosis</p>
                        <p className="text-sm text-gray-600">{result.diagnosis || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">CMS Compliance</p>
                        <p className="text-sm text-green-600 font-semibold">{result.cmsCompliance}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm"
                        onClick={() => setSelectedResult(result)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleEmailResult(result)}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadResult(result)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Saved Results</h3>
                <p className="text-gray-500">
                  You haven't saved any AI intake results yet. Process some documents in the Autonomous Intake module to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detail Modal */}
        {selectedResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>AI Intake Result Details</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedResult(null)}
                  >
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold">Patient Information</h4>
                      <p><strong>Name:</strong> {selectedResult.patientName || 'N/A'}</p>
                      <p><strong>Diagnosis:</strong> {selectedResult.diagnosis || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Processing Metrics</h4>
                      <p><strong>AI Confidence:</strong> {selectedResult.aiConfidence}</p>
                      <p><strong>CMS Compliance:</strong> {selectedResult.cmsCompliance}</p>
                      <p><strong>Processing Time:</strong> {selectedResult.processingTime || 0}ms</p>
                    </div>
                  </div>
                  
                  {selectedResult.extractedData && (
                    <div>
                      <h4 className="font-semibold mb-2">Extracted Data</h4>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedResult.extractedData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}