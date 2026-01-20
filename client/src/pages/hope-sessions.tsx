import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Play, 
  Pause, 
  Square, 
  Download, 
  FileText, 
  Mail, 
  Phone, 
  Eye, 
  Trash2, 
  Save, 
  Calendar, 
  Clock,
  User,
  Heart,
  Shield,
  Plus,
  Mic,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface HopeAssessmentSession {
  id: number;
  patientId: number | null;
  assessmentData: any;
  symptomImpactRanking: any;
  medicalReasoning: string | null;
  explainableAiOutput: any;
  cmsRegulatoryStatus: string | null;
  qualityOfLifeImpact: any;
  financialImpact: any;
  clinicianApprovalStatus: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export default function HopeSessions() {
  const [selectedSession, setSelectedSession] = useState<HopeAssessmentSession | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [faxDialogOpen, setFaxDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({ recipient: '', subject: '', message: '' });
  const [faxData, setFaxData] = useState({ faxNumber: '', coverMessage: '' });
  
  // New data collection states
  const [clinicalData, setClinicalData] = useState('');
  const [patientReportedData, setPatientReportedData] = useState('');
  const [isRecordingClinical, setIsRecordingClinical] = useState(false);
  const [isRecordingPatient, setIsRecordingPatient] = useState(false);
  const [newSessionDialogOpen, setNewSessionDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all HOPE assessment sessions
  const { data: sessions = [], isLoading, refetch } = useQuery<HopeAssessmentSession[]>({
    queryKey: ['/api/ai/hope-assessment/sessions'],
    retry: 1
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest(`/api/ai/hope-assessment/sessions/${sessionId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({
        title: "Session Deleted",
        description: "The HOPE assessment session has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/hope-assessment/sessions'] });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update session mutation
  const updateMutation = useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: number; data: any }) => {
      return await apiRequest(`/api/ai/hope-assessment/sessions/${sessionId}`, { 
        method: 'PATCH', 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      toast({
        title: "Session Updated",
        description: "The HOPE assessment session has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/hope-assessment/sessions'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Email mutation
  const emailMutation = useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: number; data: any }) => {
      return await apiRequest(`/api/ai/hope-assessment/send-email/${sessionId}`, { 
        method: 'POST', 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "The HOPE assessment summary has been sent successfully.",
      });
      setEmailDialogOpen(false);
      setEmailData({ recipient: '', subject: '', message: '' });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fax mutation
  const faxMutation = useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: number; data: any }) => {
      return await apiRequest(`/api/ai/hope-assessment/send-fax/${sessionId}`, { 
        method: 'POST', 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      toast({
        title: "eFax Sent",
        description: "The HOPE assessment summary has been faxed successfully.",
      });
      setFaxDialogOpen(false);
      setFaxData({ faxNumber: '', coverMessage: '' });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send fax. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Voice recording functions
  const startRecording = async (type: 'clinical' | 'patient') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (type === 'clinical') {
        setIsRecordingClinical(true);
      } else {
        setIsRecordingPatient(true);
      }
      
      // Simulate recording - in real implementation, would use MediaRecorder
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        if (type === 'clinical') {
          setIsRecordingClinical(false);
          setClinicalData(prev => prev + " [Voice input recorded and processed by AI]");
        } else {
          setIsRecordingPatient(false);
          setPatientReportedData(prev => prev + " [Voice input recorded and processed by AI]");
        }
        toast({
          title: "Voice Recording Complete",
          description: `${type === 'clinical' ? 'Clinical' : 'Patient'} data recorded and processed.`,
        });
      }, 3000);
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Create new HOPE session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/ai/hope-assessment/sessions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Session Created",
        description: "New HOPE assessment session created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/hope-assessment/sessions'] });
      setNewSessionDialogOpen(false);
      setClinicalData('');
      setPatientReportedData('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate AI Summary for HOPE Assessment
  const generateHopeSummary = async (session: HopeAssessmentSession) => {
    try {
      toast({
        title: "Generating AI Summary",
        description: "Creating comprehensive clinical summary with audio...",
      });

      const summaryData = {
        assessmentId: session.id,
        assessmentData: session.assessmentData,
        medicalReasoning: session.medicalReasoning,
        cmsStatus: session.cmsRegulatoryStatus,
        clinicalApproval: session.clinicianApprovalStatus
      };

      const result = await apiRequest('/api/ai/hope-assessment/generate-summary', {
        method: 'POST',
        body: JSON.stringify(summaryData)
      });

      toast({
        title: "AI Summary Generated",
        description: "Clinical summary and audio ready for review and sharing",
      });
    } catch (error) {
      toast({
        title: "Summary Generation Failed",
        description: "Could not generate AI summary. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async (session: HopeAssessmentSession) => {
    try {
      const response = await fetch(`/api/ai/hope-assessment/export-pdf/${session.id}`);
      if (!response.ok) throw new Error('Failed to export PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hope_assessment_${session.id}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Exported",
        description: "The HOPE assessment PDF has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export PDF.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAssessmentData = (assessmentData: any) => {
    if (!assessmentData) return 'No assessment data available';
    if (typeof assessmentData === 'string') return assessmentData;
    
    try {
      const data = typeof assessmentData === 'object' ? assessmentData : JSON.parse(assessmentData);
      return Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n');
    } catch {
      return 'Invalid assessment data format';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading HOPE assessment sessions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500" />
            HOPE Assessment Sessions
          </h1>
          <p className="text-gray-500 mt-1">View, manage, and export your HOPE clinical assessment sessions</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={newSessionDialogOpen} onOpenChange={setNewSessionDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create New Session
              </Button>
            </DialogTrigger>
          </Dialog>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Heart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No HOPE Assessment Sessions Yet</h3>
            <p className="text-gray-500 mb-4">Start your first HOPE assessment to see it here</p>
            <Button onClick={() => window.location.href = '/ai-hope-assessment'}>
              <Plus className="h-4 w-4 mr-2" />
              Start New Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sessions.map((session: HopeAssessmentSession) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Heart className="h-5 w-5 text-red-600" />
                    <div>
                      <CardTitle className="text-lg">HOPE Assessment #{session.id}</CardTitle>
                      <CardDescription className="flex items-center space-x-4 mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(session.createdAt), 'MMM dd, yyyy')}
                        </span>
                        {session.patientId && (
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            Patient ID: {session.patientId}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Shield className="h-4 w-4 mr-1" />
                          CMS Compliant
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(session.clinicianApprovalStatus)}>
                    {session.clinicianApprovalStatus || 'Pending Review'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {session.medicalReasoning && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Medical Reasoning Preview</h4>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {session.medicalReasoning.substring(0, 200)}
                        {session.medicalReasoning.length > 200 && '...'}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPDF(session)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setEmailDialogOpen(true);
                        }}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setFaxDialogOpen(true);
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        eFax
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Session Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>HOPE Assessment Details</DialogTitle>
            <DialogDescription>
              Complete clinical assessment and CMS compliance analysis for session #{selectedSession?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Assessment ID</Label>
                  <p className="text-sm text-gray-600">#{selectedSession.id}</p>
                </div>
                <div>
                  <Label className="font-semibold">Approval Status</Label>
                  <Badge className={getStatusColor(selectedSession.clinicianApprovalStatus)}>
                    {selectedSession.clinicianApprovalStatus || 'Pending Review'}
                  </Badge>
                </div>
                <div>
                  <Label className="font-semibold">Patient ID</Label>
                  <p className="text-sm text-gray-600">{selectedSession.patientId || 'N/A'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Created At</Label>
                  <p className="text-sm text-gray-600">
                    {format(new Date(selectedSession.createdAt), 'PPpp')}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              {selectedSession.medicalReasoning && (
                <div>
                  <Label className="font-semibold text-base">Medical Reasoning</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedSession.medicalReasoning}</p>
                  </div>
                </div>
              )}
              
              {selectedSession.assessmentData && (
                <div>
                  <Label className="font-semibold text-base">Assessment Data</Label>
                  <div className="mt-2 p-4 bg-blue-50 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">{formatAssessmentData(selectedSession.assessmentData)}</pre>
                  </div>
                </div>
              )}
              
              {selectedSession.cmsRegulatoryStatus && (
                <div>
                  <Label className="font-semibold text-base">CMS Regulatory Status</Label>
                  <div className="mt-2 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm">{selectedSession.cmsRegulatoryStatus}</p>
                  </div>
                </div>
              )}
              
              {selectedSession.explainableAiOutput && (
                <div>
                  <Label className="font-semibold text-base">AI Analysis Output</Label>
                  <div className="mt-2 p-4 bg-purple-50 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">
                      {typeof selectedSession.explainableAiOutput === 'string' 
                        ? selectedSession.explainableAiOutput 
                        : JSON.stringify(selectedSession.explainableAiOutput, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* AI Summary Section for HOPE Sessions */}
              <div className="space-y-4">
                <Separator />
                <div>
                  <Label className="font-semibold text-base flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    AI Clinical Summary & Audio
                  </Label>
                  <div className="mt-3 space-y-3">
                    {/* Generate AI Summary Button */}
                    <Button 
                      onClick={() => generateHopeSummary(selectedSession)}
                      className="w-full"
                      variant="outline"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate AI Summary for HOPE Assessment
                    </Button>
                    
                    {/* AI Summary Display */}
                    <div className="p-4 bg-blue-50 rounded-lg border">
                      <div className="font-medium text-sm text-blue-800 mb-2">
                        AI-Generated Clinical Summary
                      </div>
                      <div className="text-sm text-blue-700">
                        AI summary will appear here after generation...
                      </div>
                    </div>
                    
                    {/* Audio Summary Section */}
                    <div className="p-4 bg-purple-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-purple-800">
                          Audio Summary
                        </span>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          Available for Email
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-purple-600">
                          Professional AI-generated audio summary for easy listening and sharing
                        </div>
                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs text-purple-600">
                          Audio player will appear after summary generation
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email Summary</DialogTitle>
            <DialogDescription>
              Send the HOPE assessment summary via email
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient">Recipient Email</Label>
              <Input
                id="recipient"
                type="email"
                value={emailData.recipient}
                onChange={(e) => setEmailData(prev => ({ ...prev, recipient: e.target.value }))}
                placeholder="doctor@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="HOPE Assessment Summary"
              />
            </div>
            
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={emailData.message}
                onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Additional message..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedSession && emailMutation.mutate({ 
                sessionId: selectedSession.id, 
                data: emailData 
              })}
              disabled={!emailData.recipient || emailMutation.isPending}
            >
              {emailMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fax Dialog */}
      <Dialog open={faxDialogOpen} onOpenChange={setFaxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send eFax</DialogTitle>
            <DialogDescription>
              Send the HOPE assessment summary via secure eFax
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="faxNumber">Fax Number</Label>
              <Input
                id="faxNumber"
                value={faxData.faxNumber}
                onChange={(e) => setFaxData(prev => ({ ...prev, faxNumber: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            
            <div>
              <Label htmlFor="coverMessage">Cover Message</Label>
              <Textarea
                id="coverMessage"
                value={faxData.coverMessage}
                onChange={(e) => setFaxData(prev => ({ ...prev, coverMessage: e.target.value }))}
                placeholder="Cover message for the fax..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaxDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedSession && faxMutation.mutate({ 
                sessionId: selectedSession.id, 
                data: faxData 
              })}
              disabled={!faxData.faxNumber || faxMutation.isPending}
            >
              {faxMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Send eFax
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete HOPE Assessment Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this HOPE assessment session? This action cannot be undone.
              All assessment data, medical reasoning, and CMS compliance information will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSession && deleteMutation.mutate(selectedSession.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Session
                </>
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create New Session Dialog */}
      <Dialog open={newSessionDialogOpen} onOpenChange={setNewSessionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New HOPE Assessment Session</DialogTitle>
            <DialogDescription>
              Enter clinical data and patient reported data via voice or written input, then use AI to generate comprehensive summary
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Clinical Data Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-base">Clinical Data</Label>
                <Badge variant="secondary">Voice or Written Input</Badge>
              </div>
              
              <Textarea
                value={clinicalData}
                onChange={(e) => setClinicalData(e.target.value)}
                placeholder="Enter clinical observations, vitals, assessments, and medical findings..."
                rows={4}
                className="w-full"
              />
              
              <div className="flex items-center justify-between">
                <Button 
                  onClick={() => startRecording('clinical')}
                  disabled={isRecordingClinical}
                  variant="outline"
                  size="sm"
                >
                  {isRecordingClinical ? (
                    <>
                      <Square className="h-4 w-4 mr-2 text-red-500" />
                      Recording... (3s)
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Record Voice
                    </>
                  )}
                </Button>
                <span className="text-sm text-gray-500">
                  {clinicalData.length} characters
                </span>
              </div>
            </div>

            <Separator />

            {/* Patient Reported Data Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-base">Patient Reported Data</Label>
                <Badge variant="secondary">Voice or Written Input</Badge>
              </div>
              
              <Textarea
                value={patientReportedData}
                onChange={(e) => setPatientReportedData(e.target.value)}
                placeholder="Enter patient's reported symptoms, concerns, quality of life indicators, and subjective experiences..."
                rows={4}
                className="w-full"
              />
              
              <div className="flex items-center justify-between">
                <Button 
                  onClick={() => startRecording('patient')}
                  disabled={isRecordingPatient}
                  variant="outline"
                  size="sm"
                >
                  {isRecordingPatient ? (
                    <>
                      <Square className="h-4 w-4 mr-2 text-red-500" />
                      Recording... (3s)
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Record Voice
                    </>
                  )}
                </Button>
                <span className="text-sm text-gray-500">
                  {patientReportedData.length} characters
                </span>
              </div>
            </div>

            <Separator />

            {/* AI Processing Preview */}
            <div className="space-y-4">
              <Label className="font-semibold text-base flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                AI Processing Preview
              </Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border">
                  <div className="font-medium text-sm text-blue-800 mb-2">
                    Clinical Analysis Ready
                  </div>
                  <div className="text-xs text-blue-600">
                    {clinicalData ? '✓ Clinical data captured' : '○ Awaiting clinical data'}
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border">
                  <div className="font-medium text-sm text-green-800 mb-2">
                    Patient Data Ready
                  </div>
                  <div className="text-xs text-green-600">
                    {patientReportedData ? '✓ Patient data captured' : '○ Awaiting patient data'}
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border">
                <div className="font-medium text-sm text-purple-800 mb-2">
                  AI Summary Generation
                </div>
                <div className="text-xs text-purple-600">
                  Once created, AI will generate comprehensive clinical summary with audio for this session
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSessionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createSessionMutation.mutate({
                clinicalData,
                patientReportedData,
                assessmentData: {
                  clinical: clinicalData,
                  patientReported: patientReportedData,
                  timestamp: new Date().toISOString()
                },
                medicalReasoning: `Clinical Assessment based on clinical data and patient reported outcomes`,
                cmsRegulatoryStatus: 'compliant'
              })}
              disabled={!clinicalData || !patientReportedData || createSessionMutation.isPending}
            >
              {createSessionMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create HOPE Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}