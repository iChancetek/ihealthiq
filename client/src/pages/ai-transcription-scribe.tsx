import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Mic, FileAudio, Play, Square, Clock, Users, MicOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function AITranscriptionScribe() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioFileUrl, setAudioFileUrl] = useState("");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Authentication is handled by backend bypass for demo purposes
  // Remove blocking authentication redirect

  const startSessionMutation = useMutation({
    mutationFn: async (data: { userId: number; patientId?: number }) => {
      return await apiRequest("/api/ai/transcription/start-session", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (result) => {
      setSessionId(result.sessionId);
      setIsRecording(true);
    }
  });

  const processAudioMutation = useMutation({
    mutationFn: async (data: { sessionId: string; audioFileUrl?: string; audioData?: string; mimeType?: string }) => {
      return await apiRequest("/api/ai/transcription/process-audio", {
        method: "POST",
        body: JSON.stringify(data)
      });
    }
  });

  const { data: sessionStatus } = useQuery({
    queryKey: ["/api/ai/transcription/session"],
    refetchInterval: isAuthenticated ? 3000 : false, // Only poll when authenticated
    enabled: isAuthenticated, // Only run when authenticated
  });

  // Real microphone recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(1000); // Collect data every second
      mediaRecorderRef.current = recorder;
      setMediaRecorder(recorder);
      setIsRecording(true);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording Started",
        description: "Microphone is now capturing audio for transcription",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      toast({
        title: "Recording Stopped",
        description: "Processing audio for transcription...",
      });
    }
  };

  const processRecordedAudio = async (audioBlob: Blob) => {
    if (!sessionId) return;

    try {
      // Convert blob to base64 for upload
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        // Send to backend for processing with real audio data
        await processAudioMutation.mutateAsync({
          sessionId,
          audioData: base64Audio,
          mimeType: 'audio/webm'
        });
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing recorded audio:', error);
      toast({
        title: "Processing Failed",
        description: "Unable to process recorded audio",
        variant: "destructive",
      });
    }
  };

  const handleStartSession = () => {
    startSessionMutation.mutate({ userId: 1, patientId: 1 });
  };

  const handleProcessAudio = () => {
    if (sessionId && audioFileUrl) {
      processAudioMutation.mutate({ sessionId, audioFileUrl });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mic className="h-8 w-8 text-purple-600" />
          iSynera Scribe - AI Transcription
        </h1>
        <p className="text-gray-600 mt-2">
          Ambient listening with smart transcription and automated SOAP note generation
        </p>
      </div>

      <Tabs defaultValue="session" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="session">Session Control</TabsTrigger>
          <TabsTrigger value="transcription">Live Transcription</TabsTrigger>
          <TabsTrigger value="soap">SOAP Notes</TabsTrigger>
          <TabsTrigger value="coding">Code Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="session">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileAudio className="h-5 w-5" />
                  Session Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!sessionId ? (
                  <Button 
                    onClick={handleStartSession}
                    disabled={startSessionMutation.isPending}
                    className="w-full"
                  >
                    {startSessionMutation.isPending ? "Starting..." : "Start New Session"}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-green-800 font-medium">Session Active</p>
                      <p className="text-sm text-green-600">ID: {sessionId}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={toggleRecording}
                        variant={isRecording ? "destructive" : "default"}
                        className="flex-1"
                      >
                        {isRecording ? (
                          <>
                            <Square className="h-4 w-4 mr-2" />
                            Stop Recording
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start Recording
                          </>
                        )}
                      </Button>
                    </div>

                    {isRecording && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-red-800 font-medium flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          Recording in Progress
                        </p>
                        <p className="text-sm text-red-600 mt-1">
                          Duration: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="audioUrl">Audio File URL (for testing)</Label>
                  <Input
                    id="audioUrl"
                    placeholder="Enter audio file URL"
                    value={audioFileUrl}
                    onChange={(e) => setAudioFileUrl(e.target.value)}
                  />
                  <Button 
                    onClick={handleProcessAudio}
                    disabled={!sessionId || !audioFileUrl || processAudioMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {processAudioMutation.isPending ? "Processing..." : "Process Audio File"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Session Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionStatus ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant={(sessionStatus as any)?.status === 'active' ? 'default' : 'secondary'}>
                        {(sessionStatus as any)?.status || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{(sessionStatus as any)?.duration || 0}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Patient ID:</span>
                      <span>{(sessionStatus as any)?.patientId || 'N/A'}</span>
                    </div>
                    {(sessionStatus as any)?.completedAt && (
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span>{new Date((sessionStatus as any).completedAt).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No active session</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transcription">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Transcription</CardTitle>
            </CardHeader>
            <CardContent>
              {(sessionStatus as any)?.rawTranscript ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg min-h-[200px]">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {(sessionStatus as any).rawTranscript}
                    </p>
                  </div>
                  {(sessionStatus as any).confidenceScores && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Transcription Quality</span>
                          <span className="text-sm">{(sessionStatus as any).confidenceScores.transcriptionQuality}%</span>
                        </div>
                        <Progress value={(sessionStatus as any).confidenceScores.transcriptionQuality} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Clinical Clarity</span>
                          <span className="text-sm">{(sessionStatus as any).confidenceScores.clinicalClarity}%</span>
                        </div>
                        <Progress value={(sessionStatus as any).confidenceScores.clinicalClarity} className="h-2" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a session and begin recording to see live transcription</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="soap">
          <Card>
            <CardHeader>
              <CardTitle>SOAP Notes Generation</CardTitle>
              <CardDescription>
                Automatically generated clinical documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(sessionStatus as any)?.soapNotes ? (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-blue-600">SUBJECTIVE</Label>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm">{(sessionStatus as any).soapNotes.subjective}</p>
                        <div className="mt-2">
                          <Progress value={(sessionStatus as any).soapNotes.confidence?.subjective || 0} className="h-1" />
                          <span className="text-xs text-gray-500">{(sessionStatus as any).soapNotes.confidence?.subjective || 0}% confidence</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-green-600">OBJECTIVE</Label>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm">{(sessionStatus as any).soapNotes.objective}</p>
                        <div className="mt-2">
                          <Progress value={(sessionStatus as any).soapNotes.confidence?.objective || 0} className="h-1" />
                          <span className="text-xs text-gray-500">{(sessionStatus as any).soapNotes.confidence?.objective || 0}% confidence</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-orange-600">ASSESSMENT</Label>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-sm">{(sessionStatus as any).soapNotes.assessment}</p>
                        <div className="mt-2">
                          <Progress value={(sessionStatus as any).soapNotes.confidence?.assessment || 0} className="h-1" />
                          <span className="text-xs text-gray-500">{(sessionStatus as any).soapNotes.confidence?.assessment || 0}% confidence</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-purple-600">PLAN</Label>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm">{(sessionStatus as any).soapNotes.plan}</p>
                        <div className="mt-2">
                          <Progress value={(sessionStatus as any).soapNotes.confidence?.plan || 0} className="h-1" />
                          <span className="text-xs text-gray-500">{(sessionStatus as any).soapNotes.confidence?.plan || 0}% confidence</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Process audio to generate SOAP notes automatically</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coding">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>CPT Code Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                {(sessionStatus as any)?.cptCodeSuggestions?.length > 0 ? (
                  <div className="space-y-2">
                    {(sessionStatus as any).cptCodeSuggestions.map((code: string, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <Badge variant="outline">{code}</Badge>
                        <span className="text-sm text-gray-600">Suggested</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No CPT codes suggested yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ICD Code Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                {(sessionStatus as any)?.icdCodeSuggestions?.length > 0 ? (
                  <div className="space-y-2">
                    {(sessionStatus as any).icdCodeSuggestions.map((code: string, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <Badge variant="outline">{code}</Badge>
                        <span className="text-sm text-gray-600">Suggested</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No ICD codes suggested yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}