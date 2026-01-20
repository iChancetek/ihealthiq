import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Save, 
  Edit3, 
  Clock, 
  User, 
  Stethoscope,
  Pill,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Brain,
  Mic,
  MicOff,
  Square
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Patient {
  id: number;
  patientName: string;
  dateOfBirth: string;
  diagnosis: string;
  patientId: string;
  medications?: string[];
  allergies?: string[];
}

interface SOAPNote {
  id?: number;
  patientId: number;
  sessionId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  createdAt?: string;
  updatedAt?: string;
  isEditable: boolean;
  voiceGenerated: boolean;
  clinicalRecommendations?: string[];
}

interface SOAPNoteEditorProps {
  selectedPatient: Patient | null;
  initialSOAP?: SOAPNote;
  onSOAPSave: (soap: SOAPNote) => void;
  onOrdersRequested: (medications: string[]) => void;
  onReferralRequested: (referralData: any) => void;
}

export default function SOAPNoteEditorSimple({ 
  selectedPatient, 
  initialSOAP, 
  onSOAPSave,
  onOrdersRequested,
  onReferralRequested
}: SOAPNoteEditorProps) {
  const [soapNote, setSOAPNote] = useState<SOAPNote>({
    patientId: selectedPatient?.id || 0,
    sessionId: `session-${Date.now()}`,
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    isEditable: true,
    voiceGenerated: false,
    clinicalRecommendations: []
  });

  const [isEditing, setIsEditing] = useState(true);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceRecordingField, setVoiceRecordingField] = useState<keyof SOAPNote | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load existing SOAP notes for patient
  const { data: existingSOAPs } = useQuery({
    queryKey: ['/api/soap-notes', selectedPatient?.id],
    enabled: !!selectedPatient
  });

  // Save SOAP note mutation
  const saveMutation = useMutation({
    mutationFn: async (soapData: SOAPNote) => {
      const endpoint = soapData.id ? `/api/soap-notes/${soapData.id}` : '/api/soap-notes';
      const method = soapData.id ? 'PUT' : 'POST';
      
      return apiRequest(endpoint, {
        method,
        body: JSON.stringify(soapData)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "SOAP Note Saved",
        description: "Clinical documentation updated successfully"
      });
      onSOAPSave(data.soapNote);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/soap-notes'] });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: "Unable to save SOAP note. Please try again.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (selectedPatient) {
      setSOAPNote(prev => ({
        ...prev,
        patientId: selectedPatient.id,
        sessionId: `session-${selectedPatient.id}-${Date.now()}`
      }));
    }
  }, [selectedPatient]);

  useEffect(() => {
    if (initialSOAP) {
      setSOAPNote(initialSOAP);
    }
  }, [initialSOAP]);

  const updateSOAPField = (field: keyof SOAPNote, value: string) => {
    setSOAPNote(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (!selectedPatient) {
      toast({
        title: "No Patient Selected",
        description: "Please select a patient before saving SOAP notes",
        variant: "destructive"
      });
      return;
    }

    saveMutation.mutate(soapNote);
  };

  // Voice dictation functionality
  const startVoiceRecording = async (field: keyof SOAPNote) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      });
      
      const audioChunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        await processVoiceInput(audioBlob, field);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsVoiceRecording(true);
      setVoiceRecordingField(field);
      
      toast({
        title: "Voice Recording Started",
        description: `Recording for ${field} field...`
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsVoiceRecording(false);
      setVoiceRecordingField(null);
      setMediaRecorder(null);
      
      toast({
        title: "Processing Voice Input",
        description: "Converting speech to text..."
      });
    }
  };

  const processVoiceInput = async (audioBlob: Blob, field: keyof SOAPNote) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-input.webm');
      formData.append('field', field as string);
      
      const response = await fetch('/api/ai/transcription/process-voice-edit', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to process voice input');
      }
      
      const result = await response.json();
      
      if (result.transcription) {
        const currentValue = soapNote[field as keyof SOAPNote] as string;
        const newValue = currentValue ? 
          `${currentValue}\n\n${result.transcription}` : 
          result.transcription;
        
        updateSOAPField(field, newValue);
        
        toast({
          title: "Voice Input Added",
          description: `Added voice input to ${field} field`
        });
      }
    } catch (error) {
      toast({
        title: "Voice Processing Error",
        description: "Failed to process voice input. Please try again.",
        variant: "destructive"
      });
    }
  };

  const extractMedications = () => {
    const planText = soapNote.plan.toLowerCase();
    const medications = [];
    
    // Simple medication extraction
    if (planText.includes('metformin')) medications.push('Metformin');
    if (planText.includes('lisinopril')) medications.push('Lisinopril');
    if (planText.includes('insulin')) medications.push('Insulin');
    if (planText.includes('atorvastatin')) medications.push('Atorvastatin');
    if (planText.includes('hydrochlorothiazide')) medications.push('Hydrochlorothiazide');
    
    if (medications.length > 0) {
      onOrdersRequested(medications);
      toast({
        title: "Medications Extracted",
        description: `Found ${medications.length} medications in plan`
      });
    } else {
      toast({
        title: "No Medications Found",
        description: "No recognizable medications found in the plan section"
      });
    }
  };

  const analyzeForReferrals = () => {
    const fullText = `${soapNote.assessment} ${soapNote.plan}`.toLowerCase();
    
    const referralNeeds = {
      homeHealth: fullText.includes('home health') || fullText.includes('home care'),
      dme: fullText.includes('dme') || fullText.includes('medical equipment'),
      specialist: fullText.includes('specialist') || fullText.includes('referral'),
      therapy: fullText.includes('therapy') || fullText.includes('rehabilitation')
    };

    const hasReferrals = Object.values(referralNeeds).some(Boolean);
    
    if (hasReferrals) {
      onReferralRequested(referralNeeds);
      toast({
        title: "Referrals Identified",
        description: "Potential referral needs found in documentation"
      });
    } else {
      toast({
        title: "No Referrals Found",
        description: "No referral requirements identified"
      });
    }
  };

  if (!selectedPatient) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <div className="text-lg font-semibold text-gray-700 mb-2">Patient Required</div>
          <div className="text-sm text-gray-500">
            Please select a patient to begin clinical documentation
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Context Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            SOAP Note Documentation
          </CardTitle>
          <CardDescription>
            Patient: {selectedPatient.patientName} | DOB: {selectedPatient.dateOfBirth} | ID: {selectedPatient.patientId}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* SOAP Note Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Clinical Documentation</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="h-4 w-4 mr-1" />
                {isEditing ? 'View' : 'Edit'}
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saveMutation.isPending}
                size="sm"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="subjective" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="subjective">Subjective</TabsTrigger>
              <TabsTrigger value="objective">Objective</TabsTrigger>
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
              <TabsTrigger value="plan">Plan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="subjective" className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="subjective">Subjective (Chief Complaint & History)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isVoiceRecording && voiceRecordingField === 'subjective') {
                        stopVoiceRecording();
                      } else {
                        startVoiceRecording('subjective');
                      }
                    }}
                    disabled={isVoiceRecording && voiceRecordingField !== 'subjective'}
                    className={isVoiceRecording && voiceRecordingField === 'subjective' ? 'bg-red-100 border-red-300' : ''}
                  >
                    {isVoiceRecording && voiceRecordingField === 'subjective' ? (
                      <>
                        <Square className="h-4 w-4 mr-1" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-1" />
                        Voice Input
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="subjective"
                  value={soapNote.subjective}
                  onChange={(e) => updateSOAPField('subjective', e.target.value)}
                  placeholder="Patient's chief complaint, symptoms, history of present illness..."
                  className="min-h-32"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="objective" className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="objective">Objective (Physical Examination & Vitals)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isVoiceRecording && voiceRecordingField === 'objective') {
                        stopVoiceRecording();
                      } else {
                        startVoiceRecording('objective');
                      }
                    }}
                    disabled={isVoiceRecording && voiceRecordingField !== 'objective'}
                    className={isVoiceRecording && voiceRecordingField === 'objective' ? 'bg-red-100 border-red-300' : ''}
                  >
                    {isVoiceRecording && voiceRecordingField === 'objective' ? (
                      <>
                        <Square className="h-4 w-4 mr-1" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-1" />
                        Voice Input
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="objective"
                  value={soapNote.objective}
                  onChange={(e) => updateSOAPField('objective', e.target.value)}
                  placeholder="Vital signs, physical examination findings, diagnostic test results..."
                  className="min-h-32"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="assessment" className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="assessment">Assessment (Clinical Impression & Diagnosis)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isVoiceRecording && voiceRecordingField === 'assessment') {
                        stopVoiceRecording();
                      } else {
                        startVoiceRecording('assessment');
                      }
                    }}
                    disabled={isVoiceRecording && voiceRecordingField !== 'assessment'}
                    className={isVoiceRecording && voiceRecordingField === 'assessment' ? 'bg-red-100 border-red-300' : ''}
                  >
                    {isVoiceRecording && voiceRecordingField === 'assessment' ? (
                      <>
                        <Square className="h-4 w-4 mr-1" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-1" />
                        Voice Input
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="assessment"
                  value={soapNote.assessment}
                  onChange={(e) => updateSOAPField('assessment', e.target.value)}
                  placeholder="Primary and secondary diagnoses, clinical reasoning..."
                  className="min-h-32"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="plan" className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="plan">Plan (Treatment & Follow-up)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isVoiceRecording && voiceRecordingField === 'plan') {
                        stopVoiceRecording();
                      } else {
                        startVoiceRecording('plan');
                      }
                    }}
                    disabled={isVoiceRecording && voiceRecordingField !== 'plan'}
                    className={isVoiceRecording && voiceRecordingField === 'plan' ? 'bg-red-100 border-red-300' : ''}
                  >
                    {isVoiceRecording && voiceRecordingField === 'plan' ? (
                      <>
                        <Square className="h-4 w-4 mr-1" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-1" />
                        Voice Input
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="plan"
                  value={soapNote.plan}
                  onChange={(e) => updateSOAPField('plan', e.target.value)}
                  placeholder="Treatment plan, medications, referrals, follow-up instructions..."
                  className="min-h-32"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Clinical Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Clinical Actions
          </CardTitle>
          <CardDescription>
            AI-powered extraction and workflow automation from SOAP notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={extractMedications}
              disabled={!soapNote.plan.trim()}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <Pill className="h-6 w-6" />
              <span className="text-sm">Extract Medications</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={analyzeForReferrals}
              disabled={!soapNote.assessment.trim() && !soapNote.plan.trim()}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <UserCheck className="h-6 w-6" />
              <span className="text-sm">Analyze Referrals</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <CheckCircle className="h-6 w-6" />
              <span className="text-sm">Save & Continue</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent SOAP Notes */}
      {existingSOAPs && existingSOAPs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Documentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {existingSOAPs.slice(0, 3).map((soap: any) => (
                <div key={soap.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium text-sm">SOAP Note #{soap.id}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(soap.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {soap.voiceGenerated ? 'Voice Generated' : 'Manual Entry'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}