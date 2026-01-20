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
  FileAudio,
  Stethoscope,
  Plus,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface TranscriptionSession {
  id: number;
  sessionId: string;
  userId: number;
  patientId: number | null;
  audioFileUrl: string | null;
  transcriptionText: string | null;
  rawTranscript: string | null;
  soapNotes: any;
  confidenceScores: any;
  cptCodes: string[] | null;
  icdCodes: string[] | null;
  cptCodeSuggestions: string[] | null;
  icdCodeSuggestions: string[] | null;
  voiceCommands: any;
  duration: number | null;
  status: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  completedAt: Date | null;
  hasAudio: boolean;
  hasSOAPNotes: boolean;
}

export default function NurseSessions() {
  const [selectedSession, setSelectedSession] = useState<TranscriptionSession | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [faxDialogOpen, setFaxDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({ recipient: '', subject: '', message: '' });
  const [faxData, setFaxData] = useState({ faxNumber: '', coverMessage: '' });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all sessions
  const { data: sessions = [], isLoading, refetch } = useQuery<TranscriptionSession[]>({
    queryKey: ['/api/ai/transcription/sessions'],
    retry: 1
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiRequest(`/api/ai/transcription/sessions/${sessionId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({
        title: "Session Deleted",
        description: "The transcription session has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/transcription/sessions'] });
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
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: any }) => {
      return await apiRequest(`/api/ai/transcription/sessions/${sessionId}`, { 
        method: 'PATCH', 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      toast({
        title: "Session Updated",
        description: "The transcription session has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/transcription/sessions'] });
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
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: any }) => {
      return await apiRequest(`/api/ai/transcription/send-email/${sessionId}`, { 
        method: 'POST', 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "The transcription summary has been sent successfully.",
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
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: any }) => {
      return await apiRequest(`/api/ai/transcription/send-fax/${sessionId}`, { 
        method: 'POST', 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      toast({
        title: "eFax Sent",
        description: "The transcription summary has been faxed successfully.",
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

  const handleDownloadAudio = async (session: TranscriptionSession) => {
    try {
      const response = await fetch(`/api/ai/transcription/download-audio/${session.sessionId}`);
      if (!response.ok) throw new Error('Failed to download audio');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${session.sessionId}_audio.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Audio Downloaded",
        description: "The audio file has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download audio file.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async (session: TranscriptionSession) => {
    try {
      const response = await fetch(`/api/ai/transcription/export-pdf/${session.sessionId}`);
      if (!response.ok) throw new Error('Failed to export PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcription_${session.sessionId}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Exported",
        description: "The transcription PDF has been downloaded successfully.",
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
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSoapNotes = (soapNotes: any) => {
    if (!soapNotes) return 'No SOAP notes available';
    if (typeof soapNotes === 'string') return soapNotes;
    
    try {
      const notes = typeof soapNotes === 'object' ? soapNotes : JSON.parse(soapNotes);
      return Object.entries(notes).map(([key, value]) => `${key}: ${value}`).join('\n');
    } catch {
      return 'Invalid SOAP notes format';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading sessions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">iSynera Scribe Sessions</h1>
          <p className="text-gray-500 mt-1">View, manage, and export your transcription sessions</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Stethoscope className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sessions Yet</h3>
            <p className="text-gray-500 mb-4">Start your first transcription session to see it here</p>
            <Button onClick={() => window.location.href = '/ai-transcription-scribe'}>
              <Plus className="h-4 w-4 mr-2" />
              Start New Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sessions.map((session: TranscriptionSession) => (
            <Card key={session.sessionId} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileAudio className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">Session {session.sessionId.substring(0, 8)}</CardTitle>
                      <CardDescription className="flex items-center space-x-4 mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(session.createdAt), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDuration(session.duration)}
                        </span>
                        {session.patientId && (
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            Patient ID: {session.patientId}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(session.status)}>
                    {session.status || 'Unknown'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {session.transcriptionText && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Transcription Preview</h4>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {session.transcriptionText.substring(0, 200)}
                        {session.transcriptionText.length > 200 && '...'}
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
                        onClick={() => handleDownloadAudio(session)}
                        disabled={!session.hasAudio}
                        className={!session.hasAudio ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {session.hasAudio ? "Audio" : "No Audio"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPDF(session)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
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
            <DialogTitle>Session Details</DialogTitle>
            <DialogDescription>
              Complete transcription and analysis for session {selectedSession?.sessionId}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Session ID</Label>
                  <p className="text-sm text-gray-600">{selectedSession.sessionId}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <Badge className={getStatusColor(selectedSession.status)}>
                    {selectedSession.status || 'Unknown'}
                  </Badge>
                </div>
                <div>
                  <Label className="font-semibold">Duration</Label>
                  <p className="text-sm text-gray-600">{formatDuration(selectedSession.duration)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Created At</Label>
                  <p className="text-sm text-gray-600">
                    {format(new Date(selectedSession.createdAt), 'PPpp')}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              {selectedSession.transcriptionText && (
                <div>
                  <Label className="font-semibold text-base">Transcription</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedSession.transcriptionText}</p>
                  </div>
                </div>
              )}
              
              {selectedSession.soapNotes && (
                <div>
                  <Label className="font-semibold text-base">SOAP Notes</Label>
                  <div className="mt-2 p-4 bg-blue-50 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">{formatSoapNotes(selectedSession.soapNotes)}</pre>
                  </div>
                </div>
              )}
              
              {(selectedSession.cptCodes || selectedSession.icdCodes) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedSession.cptCodes && (
                    <div>
                      <Label className="font-semibold">CPT Codes</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedSession.cptCodes.map((code, index) => (
                          <Badge key={index} variant="secondary">{code}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedSession.icdCodes && (
                    <div>
                      <Label className="font-semibold">ICD Codes</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedSession.icdCodes.map((code, index) => (
                          <Badge key={index} variant="secondary">{code}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              Send the transcription summary via email
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
                placeholder="Transcription Summary"
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
                sessionId: selectedSession.sessionId, 
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
              Send the transcription summary via secure eFax
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
                sessionId: selectedSession.sessionId, 
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
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transcription session? This action cannot be undone.
              All audio files, transcriptions, and SOAP notes will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSession && deleteMutation.mutate(selectedSession.sessionId)}
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
    </div>
  );
}