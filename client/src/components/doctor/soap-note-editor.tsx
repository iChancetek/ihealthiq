import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Save, 
  Edit3, 
  Mic, 
  MicOff, 
  RefreshCw, 
  Clock, 
  User, 
  Users,
  Stethoscope,
  Pill,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Brain
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

export default function SOAPNoteEditor({ 
  selectedPatient, 
  initialSOAP, 
  onSOAPSave, 
  onOrdersRequested,
  onReferralRequested 
}: SOAPNoteEditorProps) {
  const [soap, setSOAP] = useState<SOAPNote>({
    patientId: selectedPatient?.id || 0,
    sessionId: `SOAP-${Date.now()}`,
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    isEditable: true,
    voiceGenerated: false
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentSection, setCurrentSection] = useState<'subjective' | 'objective' | 'assessment' | 'plan'>('subjective');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load initial SOAP note if provided
  useEffect(() => {
    if (initialSOAP) {
      setSOAP(initialSOAP);
    } else if (selectedPatient) {
      setSOAP(prev => ({
        ...prev,
        patientId: selectedPatient.id,
        sessionId: `SOAP-${selectedPatient.id}-${Date.now()}`
      }));
    }
  }, [initialSOAP, selectedPatient]);

  // Save SOAP note mutation
  const saveSOAPMutation = useMutation({
    mutationFn: async (soapData: SOAPNote) => {
      return apiRequest('/api/doctor/soap-notes', {
        method: 'POST',
        body: JSON.stringify(soapData)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "SOAP Note Saved",
        description: "Clinical documentation saved successfully"
      });
      onSOAPSave(data.soapNote);
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/soap-notes'] });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: "Failed to save SOAP note",
        variant: "destructive"
      });
    }
  });

  // AI enhancement mutation for SOAP notes
  const enhanceSOAPMutation = useMutation({
    mutationFn: async (soapData: SOAPNote) => {
      return apiRequest('/api/doctor/enhance-soap', {
        method: 'POST',
        body: JSON.stringify({
          soap: soapData,
          patientContext: selectedPatient
        })
      });
    },
    onSuccess: (data) => {
      setSOAP(prev => ({
        ...prev,
        ...data.enhancedSOAP,
        clinicalRecommendations: data.recommendations
      }));
      toast({
        title: "AI Enhancement Complete",
        description: "SOAP note enhanced with clinical insights"
      });
    }
  });

  // Voice transcription for SOAP sections
  const voiceTranscriptionMutation = useMutation({
    mutationFn: async ({ section, audioBlob }: { section: string; audioBlob: Blob }) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-input.webm');
      formData.append('section', section);
      formData.append('patientId', selectedPatient?.id.toString() || '');
      
      return apiRequest('/api/doctor/voice-to-soap', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: (data) => {
      setSOAP(prev => ({
        ...prev,
        [currentSection]: prev[currentSection] + ' ' + data.transcription,
        voiceGenerated: true
      }));
      setIsRecording(false);
      toast({
        title: "Voice Transcription Complete",
        description: `${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)} section updated`
      });
    }
  });

  const handleSectionUpdate = (section: keyof SOAPNote, value: string) => {
    setSOAP(prev => ({
      ...prev,
      [section]: value
    }));
  };

  const handleSave = () => {
    if (!selectedPatient) {
      toast({
        title: "No Patient Selected",
        description: "Please select a patient before saving SOAP note",
        variant: "destructive"
      });
      return;
    }
    
    saveSOAPMutation.mutate(soap);
    setIsEditing(false);
  };

  const extractMedications = (): string[] => {
    const planText = soap.plan.toLowerCase();
    const medications: string[] = [];
    
    // Simple medication extraction patterns
    const medPatterns = [
      /(\w+)\s+\d+\s*mg/g,
      /(metformin|lisinopril|atorvastatin|amlodipine|omeprazole|levothyroxine)/gi
    ];
    
    medPatterns.forEach(pattern => {
      const matches = planText.match(pattern);
      if (matches) {
        medications.push(...matches);
      }
    });
    
    return [...new Set(medications)]; // Remove duplicates
  };

  const extractReferralNeeds = () => {
    const assessmentText = soap.assessment.toLowerCase();
    const planText = soap.plan.toLowerCase();
    const combinedText = assessmentText + ' ' + planText;
    
    const referralIndicators = {
      homeHealth: combinedText.includes('home health') || combinedText.includes('home care'),
      dme: combinedText.includes('dme') || combinedText.includes('medical equipment'),
      specialist: combinedText.includes('specialist') || combinedText.includes('referral to'),
      therapy: combinedText.includes('physical therapy') || combinedText.includes('occupational therapy')
    };
    
    return referralIndicators;
  };

  if (!selectedPatient) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <div className="text-lg font-semibold text-gray-700 mb-2">Patient Required</div>
          <div className="text-sm text-gray-500">
            Please select a patient to create or edit SOAP notes
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Context Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              SOAP Documentation
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {selectedPatient.patientId}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {new Date().toLocaleDateString()}
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Patient: <strong>{selectedPatient.patientName}</strong> | 
            Primary Diagnosis: <strong>{selectedPatient.diagnosis}</strong>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* SOAP Note Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Clinical Documentation</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => enhanceSOAPMutation.mutate(soap)}
                disabled={enhanceSOAPMutation.isPending}
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Enhance
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditing ? 'View' : 'Edit'}
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={saveSOAPMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save SOAP
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
            
            {(['subjective', 'objective', 'assessment', 'plan'] as const).map((section) => (
              <TabsContent key={section} value={section} className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={section} className="text-lg font-semibold capitalize">
                      {section}
                    </Label>
                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentSection(section);
                          setIsRecording(!isRecording);
                        }}
                        className={isRecording && currentSection === section ? 'bg-red-100 border-red-300' : ''}
                      >
                        {isRecording && currentSection === section ? (
                          <MicOff className="h-4 w-4 mr-2" />
                        ) : (
                          <Mic className="h-4 w-4 mr-2" />
                        )}
                        Voice Input
                      </Button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <Textarea
                      id={section}
                      value={soap[section]}
                      onChange={(e) => handleSectionUpdate(section, e.target.value)}
                      placeholder={`Enter ${section} findings...`}
                      className="min-h-32 text-sm"
                    />
                  ) : (
                    <div className="min-h-32 p-4 bg-gray-50 rounded-lg border">
                      <div className="text-sm whitespace-pre-wrap">
                        {soap[section] || `No ${section} data documented`}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Clinical Recommendations */}
      {soap.clinicalRecommendations && soap.clinicalRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Clinical Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {soap.clinicalRecommendations.map((recommendation, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="text-sm text-blue-800">{recommendation}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Quick Clinical Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => onOrdersRequested(extractMedications())}
              disabled={!soap.plan}
              className="flex items-center gap-2"
            >
              <Pill className="h-4 w-4" />
              Generate Orders
              {extractMedications().length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {extractMedications().length}
                </Badge>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onReferralRequested(extractReferralNeeds())}
              disabled={!soap.assessment && !soap.plan}
              className="flex items-center gap-2"
            >
              <UserCheck className="h-4 w-4" />
              Create Referrals
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                // Integration with preferred providers
                toast({
                  title: "Provider Network",
                  description: "Opening preferred provider directory..."
                });
              }}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Find Providers
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}