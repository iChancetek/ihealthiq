import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Mic, MicOff, Square, Play, Download, FileText, Mail, Send, Share2, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function AITranscriptionScribe() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcription, setTranscription] = useState("");
  const [soapNotes, setSoapNotes] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [summaryAudioUrl, setSummaryAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [emailData, setEmailData] = useState({
    recipient: "",
    subject: "",
    message: ""
  });
  const [faxData, setFaxData] = useState({
    faxNumber: "",
    coverMessage: ""
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Start new session
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return await apiRequest("/api/ai/transcription/start-session", {
        method: "POST",
        body: JSON.stringify({ 
          userId: user.id, 
          patientId: 1 // Default patient for now - can be enhanced later
        })
      });
    },
    onSuccess: (result) => {
      setSessionId(result.sessionId);
      toast({
        title: "Session Started",
        description: "Ready to begin recording",
      });
    },
    onError: (error) => {
      toast({
        title: "Session Failed",
        description: "Could not start transcription session",
        variant: "destructive",
      });
    }
  });

  // Process audio for transcription
  const processAudioMutation = useMutation({
    mutationFn: async (data: { sessionId: string; audioData: string }) => {
      return await apiRequest("/api/ai/transcription/process-audio", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (result) => {
      setTranscription(result.transcription || "");
      setSoapNotes(result.soapNotes || "");
      setAiSummary(result.aiSummary || "");
      if (result.summaryAudioUrl) {
        setSummaryAudioUrl(result.summaryAudioUrl);
      }
      toast({
        title: "Audio Processed",
        description: "Transcription, SOAP notes, and AI summary generated",
      });
    },
    onError: (error) => {
      toast({
        title: "Processing Failed",
        description: "Could not process audio",
        variant: "destructive",
      });
    }
  });

  // Email transcription summary
  const emailMutation = useMutation({
    mutationFn: async (data: { sessionId: string; recipient: string; subject: string; message: string }) => {
      return await apiRequest("/api/ai/transcription/email-summary", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Transcription summary emailed successfully",
      });
      setEmailData({ recipient: "", subject: "", message: "" });
    },
    onError: (error: any) => {
      console.error('Email error:', error);
      
      // Handle specific SendGrid verification error
      if (error?.message?.includes('verification') || error?.message?.includes('verify')) {
        toast({
          title: "Email Verification Required",
          description: "The sender email needs to be verified in SendGrid dashboard. Please contact your administrator.",
          variant: "destructive",
        });
      } else if (error?.message?.includes('SENDGRID_API_KEY')) {
        toast({
          title: "Email Service Not Configured",
          description: "SendGrid API key is missing. Please contact your administrator.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email Failed",
          description: error?.message || "Could not send email",
          variant: "destructive",
        });
      }
    }
  });

  // Generate AI summary with audio
  const generateSummaryMutation = useMutation({
    mutationFn: async (data: { sessionId: string; transcription: string; soapNotes: string }) => {
      return await apiRequest("/api/ai/transcription/generate-summary", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (result) => {
      setAiSummary(result.summary || "");
      if (result.audioUrl) {
        setSummaryAudioUrl(result.audioUrl);
      }
      toast({
        title: "AI Summary Generated",
        description: "Summary and audio created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Summary Failed",
        description: "Could not generate AI summary",
        variant: "destructive",
      });
    }
  });

  // eFax transcription summary
  const faxMutation = useMutation({
    mutationFn: async (data: { sessionId: string; faxNumber: string; coverMessage: string }) => {
      return await apiRequest("/api/ai/transcription/efax-summary", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Fax Sent",
        description: "Transcription summary faxed successfully",
      });
      setFaxData({ faxNumber: "", coverMessage: "" });
    },
    onError: (error) => {
      toast({
        title: "Fax Failed",
        description: "Could not send fax",
        variant: "destructive",
      });
    }
  });

  // Import transcription file
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('transcriptionFile', file);
      
      return await fetch('/api/ai/transcription/import', {
        method: 'POST',
        body: formData
      }).then(res => res.json());
    },
    onSuccess: (result) => {
      setSessionId(result.sessionId);
      setTranscription(result.importedData.transcriptionLength > 0 ? 'Imported transcription data available' : '');
      setSoapNotes(result.importedData.hasSOAPNotes ? 'Imported SOAP notes available' : '');
      setShowImportDialog(false);
      setImportFile(null);
      
      toast({
        title: "Import Successful",
        description: `Transcription imported from ${result.importedData.originalFilename}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: "Could not import transcription file",
        variant: "destructive",
      });
    }
  });

  const startRecording = async () => {
    try {
      // Start session first
      if (!sessionId) {
        await startSessionMutation.mutateAsync();
        return; // Will be called again after session is created
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordedAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Store audio blob for download capability
        setAudioBlob(recordedAudioBlob);
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          processAudioMutation.mutate({
            sessionId: sessionId!,
            audioData: base64Audio
          });
        };
        reader.readAsDataURL(recordedAudioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording Started",
        description: "Microphone is active",
      });

    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Recording Failed",
        description: "Cannot access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      toast({
        title: "Recording Stopped",
        description: "Processing audio...",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Download audio recording
  const downloadAudio = async () => {
    if (!sessionId) {
      toast({
        title: "Download Failed",
        description: "No session available",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // First try to download from server if session has audio file
      const response = await fetch(`/api/ai/transcription/download-audio/${sessionId}`, {
        method: "GET",
        credentials: 'include'
      });
      
      if (response.ok) {
        // Server has audio file, download it
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_${sessionId}_${new Date().toISOString().split('T')[0]}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Audio Downloaded",
          description: "Recording saved to your device",
        });
      } else if (audioBlob) {
        // Fallback to local audio blob if server doesn't have file
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_${sessionId}_${new Date().toISOString().split('T')[0]}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Audio Downloaded",
          description: "Local recording saved to your device",
        });
      } else {
        toast({
          title: "Download Failed",
          description: "No audio available for this session",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Audio download error:', error);
      
      // Fallback to local audio blob if server request fails
      if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_${sessionId}_${new Date().toISOString().split('T')[0]}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Audio Downloaded",
          description: "Local recording saved to your device",
        });
      } else {
        toast({
          title: "Download Failed",
          description: "Could not download audio",
          variant: "destructive",
        });
      }
    }
  };

  // Download transcription as PDF
  const downloadTranscriptionPDF = async () => {
    if (!sessionId || !transcription) return;
    
    try {
      // Use fetch directly for binary data instead of apiRequest
      const response = await fetch(`/api/ai/transcription/export-pdf/${sessionId}`, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Include session cookies for authentication
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Get the binary data as blob
      const blob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcription_${sessionId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Downloaded",
        description: "Transcription exported successfully",
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: "Export Failed",
        description: "Could not generate PDF",
        variant: "destructive",
      });
    }
  };

  // Download transcription as text
  const downloadTranscriptionText = () => {
    if (!transcription) return;
    
    const content = `iSynera AI Healthcare Platform - Transcription Summary
Session ID: ${sessionId}
Date: ${new Date().toLocaleString()}
Provider: Admin User

TRANSCRIPTION:
${transcription}

SOAP NOTES:
${soapNotes}

---
Generated by iSynera AI Healthcare Platform
HIPAA Compliant Medical Documentation System`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription_${sessionId}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Text Downloaded",
      description: "Transcription saved as text file",
    });
  };

  // Send email
  const sendEmail = () => {
    if (!sessionId || !emailData.recipient) return;
    
    emailMutation.mutate({
      sessionId: sessionId,
      recipient: emailData.recipient,
      subject: emailData.subject || `Transcription Summary - Session ${sessionId.substring(0, 8)}`,
      message: emailData.message
    });
  };

  // Send eFax
  const sendFax = () => {
    if (!sessionId || !faxData.faxNumber) return;
    
    faxMutation.mutate({
      sessionId: sessionId,
      faxNumber: faxData.faxNumber,
      coverMessage: faxData.coverMessage
    });
  };

  // Handle file import
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  // Import selected file
  const handleImportFile = () => {
    if (importFile) {
      importMutation.mutate(importFile);
    }
  };

  // Authentication checks - moved after all hooks are defined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">Please log in to use the voice transcription feature.</p>
            <Button onClick={() => window.location.href = '/api/login'} className="w-full">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          iSynera AI Transcription Scribe
        </h1>
        <p className="text-xl text-gray-600">
          Real-time clinical transcription with AI-powered SOAP note generation
        </p>
      </div>

      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-6 h-6" />
            Recording Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4">
            {!sessionId ? (
              <>
                <Button 
                  onClick={() => startSessionMutation.mutate()}
                  disabled={startSessionMutation.isPending}
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Session
                </Button>
                
                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg">
                      <Upload className="w-5 h-5 mr-2" />
                      Import Transcription
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Transcription File</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="file-upload">Select file to import</Label>
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".txt,.json,.csv"
                          onChange={handleFileUpload}
                          className="mt-2"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Supported formats: Text (.txt), JSON (.json), CSV (.csv)
                        </p>
                      </div>
                      
                      {importFile && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm font-medium">Selected file:</p>
                          <p className="text-sm text-gray-600">{importFile.name}</p>
                          <p className="text-xs text-gray-500">
                            Size: {(importFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      )}
                      
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowImportDialog(false);
                            setImportFile(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleImportFile}
                          disabled={!importFile || importMutation.isPending}
                        >
                          {importMutation.isPending ? "Importing..." : "Import"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : !isRecording ? (
              <Button 
                onClick={startRecording}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button 
                onClick={stopRecording}
                size="lg"
                variant="destructive"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop Recording
              </Button>
            )}
          </div>

          {isRecording && (
            <div className="text-center mt-4">
              <Badge variant="destructive" className="text-lg px-4 py-2">
                <MicOff className="w-4 h-4 mr-2 animate-pulse" />
                Recording: {formatTime(recordingTime)}
              </Badge>
            </div>
          )}

          {sessionId && (
            <div className="text-center mt-2">
              <Badge variant="outline">
                Session: {typeof sessionId === 'string' ? sessionId.substring(0, 8) : String(sessionId).substring(0, 8)}...
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcription Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Live Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg">
              {transcription ? (
                <p className="text-sm leading-relaxed">{transcription}</p>
              ) : (
                <p className="text-gray-500 italic">
                  Transcription will appear here after recording...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI-Generated SOAP Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg">
              {soapNotes ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {soapNotes}
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  SOAP notes will be generated automatically...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              AI Summary & Real-Time Preview
              {transcription && soapNotes && (
                <Button 
                  onClick={() => generateSummaryMutation.mutate({
                    sessionId: sessionId!,
                    transcription,
                    soapNotes
                  })}
                  disabled={generateSummaryMutation.isPending}
                  size="sm"
                  variant="outline"
                >
                  {generateSummaryMutation.isPending ? "Generating..." : "Generate Summary"}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* AI Summary Text */}
              <div className="min-h-[150px] p-4 bg-blue-50 rounded-lg border">
                {aiSummary ? (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {aiSummary}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">
                    AI summary will appear here after processing...
                  </p>
                )}
              </div>
              
              {/* Audio Playback */}
              {summaryAudioUrl && (
                <div className="p-4 bg-purple-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm text-purple-800">
                      AI Summary Audio
                    </span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      Ready for Email
                    </Badge>
                  </div>
                  <audio 
                    controls 
                    className="w-full"
                    src={summaryAudioUrl}
                  >
                    Your browser does not support the audio element.
                  </audio>
                  <p className="text-xs text-purple-600 mt-2">
                    This audio summary can be included in email communications
                  </p>
                </div>
              )}
              
              {/* Real-Time Transcription Preview */}
              {isRecording && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-sm text-green-800">
                      Live Transcription Preview
                    </span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Recording: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </Badge>
                  </div>
                  <div className="text-sm text-green-700 min-h-[60px]">
                    {transcription || "Listening for audio input..."}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nurse Workflow Actions */}
      {(transcription && soapNotes) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-6 h-6" />
              Nurse Workflow Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Audio Download */}
              <Button 
                onClick={downloadAudio}
                disabled={!sessionId}
                variant="outline"
                className="flex items-center gap-2 h-auto p-4"
              >
                <Download className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Download Audio</div>
                  <div className="text-xs text-gray-500">Save recording (WebM)</div>
                </div>
              </Button>

              {/* PDF Export */}
              <Button 
                onClick={downloadTranscriptionPDF}
                variant="outline"
                className="flex items-center gap-2 h-auto p-4"
              >
                <FileText className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Export PDF</div>
                  <div className="text-xs text-gray-500">Professional format</div>
                </div>
              </Button>

              {/* Text Export */}
              <Button 
                onClick={downloadTranscriptionText}
                variant="outline"
                className="flex items-center gap-2 h-auto p-4"
              >
                <FileText className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Export Text</div>
                  <div className="text-xs text-gray-500">Plain text format</div>
                </div>
              </Button>

              {/* Email Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2 h-auto p-4"
                  >
                    <Mail className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Email Summary</div>
                      <div className="text-xs text-gray-500">Send to recipient</div>
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Email Transcription Summary</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email-recipient">Recipient Email *</Label>
                      <Input
                        id="email-recipient"
                        type="email"
                        placeholder="recipient@healthcare.com"
                        value={emailData.recipient}
                        onChange={(e) => setEmailData({...emailData, recipient: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-subject">Subject</Label>
                      <Input
                        id="email-subject"
                        placeholder={`Transcription Summary - Session ${sessionId?.substring(0, 8)}`}
                        value={emailData.subject}
                        onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-message">Additional Message</Label>
                      <Textarea
                        id="email-message"
                        placeholder="Optional message to include with the transcription..."
                        value={emailData.message}
                        onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                        rows={3}
                      />
                    </div>
                    
                    {/* AI Summary Audio Option */}
                    {summaryAudioUrl && (
                      <div className="p-3 bg-purple-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-purple-800">
                            AI Summary Audio Available
                          </span>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            MP3 Audio
                          </Badge>
                        </div>
                        <p className="text-xs text-purple-600 mb-2">
                          The AI-generated clinical summary audio will be automatically included as an email attachment
                        </p>
                        <audio 
                          controls 
                          className="w-full h-8"
                          src={summaryAudioUrl}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                    
                    {/* Email Content Preview */}
                    {aiSummary && (
                      <div className="p-3 bg-blue-50 rounded-lg border">
                        <span className="text-sm font-medium text-blue-800 block mb-2">
                          AI Summary Preview (Will be included in email)
                        </span>
                        <div className="text-xs text-blue-700 max-h-20 overflow-y-auto">
                          {aiSummary.substring(0, 200)}...
                        </div>
                      </div>
                    )}
                    <Button 
                      onClick={sendEmail}
                      disabled={!emailData.recipient || emailMutation.isPending}
                      className="w-full"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {emailMutation.isPending ? "Sending..." : "Send Email"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* eFax Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2 h-auto p-4"
                  >
                    <Send className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Send eFax</div>
                      <div className="text-xs text-gray-500">Secure transmission</div>
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>eFax Transcription Summary</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fax-number">Fax Number *</Label>
                      <Input
                        id="fax-number"
                        type="tel"
                        placeholder="+1-555-123-4567"
                        value={faxData.faxNumber}
                        onChange={(e) => setFaxData({...faxData, faxNumber: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fax-message">Cover Message</Label>
                      <Textarea
                        id="fax-message"
                        placeholder="Optional cover page message..."
                        value={faxData.coverMessage}
                        onChange={(e) => setFaxData({...faxData, coverMessage: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Fax will include:</p>
                      <ul className="list-disc list-inside text-xs mt-1">
                        <li>Session metadata and timestamp</li>
                        <li>Complete transcription</li>
                        <li>Generated SOAP notes</li>
                        <li>HIPAA compliance footer</li>
                      </ul>
                    </div>
                    <Button 
                      onClick={sendFax}
                      disabled={!faxData.faxNumber || faxMutation.isPending}
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {faxMutation.isPending ? "Sending..." : "Send eFax"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

            </div>
            
            <Separator className="my-4" />
            
            <div className="text-xs text-gray-500 text-center">
              All exports and transmissions are HIPAA compliant and include audit logging
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status */}
      {(startSessionMutation.isPending || processAudioMutation.isPending) && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">
              {startSessionMutation.isPending ? "Starting session..." : "Processing audio..."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}