import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { 
  Stethoscope, 
  FileText, 
  Pill, 
  UserCheck, 
  Brain, 
  Database,
  Mic,
  Download,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Activity,
  User,
  Heart,
  Calendar
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AITranscriptionScribe from '@/pages/ai-transcription-scribe-working';
import { NewPrescriptionDialog } from '@/components/prescriptions/new-prescription-dialog';
import { RefillRequestsDialog } from '@/components/prescriptions/refill-requests-dialog';
import { AIDoseRecommendationsDialog } from '@/components/prescriptions/ai-dose-recommendations-dialog';
import OneClickReferralDialog from '@/components/referrals/one-click-referral-dialog';
import EHRIntegrationPanelSimple from '@/components/ehr/EHRIntegrationPanelSimple';
import PatientSelectorEnhanced from '@/components/doctor/patient-selector-enhanced';
import SOAPNoteEditorSimple from '@/components/doctor/soap-note-editor-simple';
import IntelligentOrders from '@/components/doctor/intelligent-orders';
import IntelligentReferrals from '@/components/doctor/intelligent-referrals';
import EHRDataUpload from '@/components/doctor/ehr-data-upload';
import { PatientDataManagement } from '@/components/doctor/patient-data-management';

interface DoctorMetrics {
  patientsToday: number;
  soapNotesGenerated: number;
  referralsSent: number;
  ordersProcessed: number;
  pendingReviews: number;
}

interface RecentSession {
  id: number;
  patientName: string;
  sessionType: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'reviewed';
  soapGenerated: boolean;
}

interface AIRecommendation {
  id: number;
  type: 'referral' | 'order' | 'documentation' | 'alert';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  patientName: string;
  createdAt: string;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Patient selection and workflow state
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [currentSOAP, setCurrentSOAP] = useState<any>(null);
  const [extractedMedications, setExtractedMedications] = useState<string[]>([]);
  const [referralNeeds, setReferralNeeds] = useState<any>(null);
  const [aiAutomationData, setAiAutomationData] = useState<any>(null);
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  
  // New patient form state
  const [newPatientForm, setNewPatientForm] = useState({
    patientName: '',
    dateOfBirth: '',
    patientId: '',
    diagnosis: '',
    physician: user?.username || ''
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create patient');
      }
      
      return response.json();
    },
    onSuccess: (newPatient) => {
      toast({
        title: "Success",
        description: `Patient "${newPatient.patientName}" created successfully`,
      });
      
      // Reset form and close dialog
      setNewPatientForm({
        patientName: '',
        dateOfBirth: '',
        patientId: '',
        diagnosis: '',
        physician: user?.username || ''
      });
      setShowNewPatientDialog(false);
      
      // Refresh patients list
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      
      // Optionally select the new patient
      setSelectedPatient(newPatient);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create patient. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle new patient form submission
  const handleCreatePatient = () => {
    if (!newPatientForm.patientName || !newPatientForm.dateOfBirth) {
      toast({
        title: "Validation Error",
        description: "Patient name and date of birth are required",
        variant: "destructive",
      });
      return;
    }
    
    createPatientMutation.mutate(newPatientForm);
  };

  // Check if user has access (admin, administrator, or doctor roles)
  const hasAccess = user?.role === 'doctor' || user?.role === 'admin' || user?.role === 'administrator';

  // Fetch doctor-specific metrics
  const { data: metrics } = useQuery<DoctorMetrics>({
    queryKey: ['/api/doctor/metrics'],
    enabled: hasAccess
  });

  // Fetch recent sessions
  const { data: recentSessions } = useQuery<RecentSession[]>({
    queryKey: ['/api/doctor/recent-sessions'],
    enabled: hasAccess
  });

  // Fetch AI recommendations
  const { data: aiRecommendations } = useQuery<AIRecommendation[]>({
    queryKey: ['/api/doctor/ai-recommendations'],
    enabled: hasAccess
  });

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              This dashboard is only available to users with Admin or Doctor roles.
              Current role: {user?.role || 'Unknown'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
            Doctor Dashboard
          </h1>
          <p className="text-muted-foreground">
            AI-Enhanced Clinical Tools & Patient Management
          </p>
        </div>
        <div className="flex items-center gap-3">
          {aiAutomationData && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="w-4 h-4 mr-1" />
              Clinical Automation Active
            </Badge>
          )}
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            <Stethoscope className="w-4 h-4 mr-1" />
            Doctor Access
          </Badge>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.patientsToday || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SOAP Notes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.soapNotesGenerated || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referrals Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.referralsSent || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Processed</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.ordersProcessed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics?.pendingReviews || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scribe">iSynera Scribe</TabsTrigger>
          <TabsTrigger value="orders">Orders & Refills</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="patient-data">Patient Data</TabsTrigger>
          <TabsTrigger value="ehr-upload">EHR Data Upload</TabsTrigger>
          <TabsTrigger value="ai-recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Sessions
                </CardTitle>
                <CardDescription>
                  Your latest patient interactions and SOAP notes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentSessions?.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{session.patientName}</p>
                        <p className="text-sm text-muted-foreground">{session.sessionType}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.soapGenerated && (
                          <Badge variant="secondary" className="text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            SOAP
                          </Badge>
                        )}
                        <Badge 
                          variant={session.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(!recentSessions || recentSessions.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">
                      No recent sessions found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Recommendations
                </CardTitle>
                <CardDescription>
                  Smart suggestions for patient care
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiRecommendations?.slice(0, 5).map((rec) => (
                    <div key={rec.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={`p-1 rounded-full ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {rec.type === 'referral' && <UserCheck className="w-3 h-3" />}
                        {rec.type === 'order' && <Pill className="w-3 h-3" />}
                        {rec.type === 'documentation' && <FileText className="w-3 h-3" />}
                        {rec.type === 'alert' && <AlertTriangle className="w-3 h-3" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-muted-foreground">{rec.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rec.patientName} • {new Date(rec.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                        {rec.priority}
                      </Badge>
                    </div>
                  ))}
                  {(!aiRecommendations || aiRecommendations.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">
                      No recommendations available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* iSynera Scribe Tab - Enhanced Patient Workflow */}
        <TabsContent value="scribe" className="space-y-6">
          {/* Patient Selection - Required before starting any documentation */}
          <PatientSelectorEnhanced
            selectedPatient={selectedPatient}
            onPatientSelect={(patient) => {
              setSelectedPatient(patient);
              // Reset workflow state when changing patients
              setCurrentSOAP(null);
              setExtractedMedications([]);
              setReferralNeeds(null);
            }}
            onNewPatient={() => {
              setShowNewPatientDialog(true);
            }}
          />
          
          {/* Only show documentation tools when patient is selected */}
          {selectedPatient && (
            <>
              {/* SOAP Note Editor with AI Enhancement */}
              <SOAPNoteEditorSimple
                selectedPatient={selectedPatient}
                initialSOAP={currentSOAP}
                onSOAPSave={async (soap) => {
                  setCurrentSOAP(soap);
                  
                  // Intelligent AI-driven clinical automation from SOAP notes
                  try {
                    // Call AI service to extract structured clinical data
                    const response = await fetch('/api/ai/clinical-automation/process-soap', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        soapNote: soap,
                        patientId: selectedPatient.id,
                        extractionMode: 'comprehensive'
                      })
                    });
                    
                    if (response.ok) {
                      const automationResults = await response.json();
                      
                      // Store complete AI automation data for downstream modules
                      setAiAutomationData(automationResults);
                      
                      // Update extracted medications with AI analysis
                      if (automationResults.medications?.length > 0) {
                        setExtractedMedications(automationResults.medications.map((med: any) => med.name));
                      }
                      
                      // Update referral needs with AI insights
                      if (automationResults.referralNeeds) {
                        setReferralNeeds(automationResults.referralNeeds);
                      }
                      
                      // Trigger automatic clinical workflows
                      if (automationResults.autoTriggers) {
                        // Auto-populate orders if indicated
                        if (automationResults.autoTriggers.shouldCreateOrders) {
                          console.log('Auto-triggering orders workflow for:', automationResults.medications);
                        }
                        
                        // Auto-initiate referrals if needed
                        if (automationResults.autoTriggers.shouldCreateReferrals) {
                          console.log('Auto-triggering referrals workflow for:', automationResults.referralNeeds);
                        }
                        
                        // Auto-check provider network
                        if (automationResults.autoTriggers.shouldCheckProviders) {
                          console.log('Auto-checking preferred provider network for:', automationResults.specialistTypes);
                        }
                      }
                      
                      toast({
                        title: "Clinical Automation Activated",
                        description: `Extracted ${automationResults.medications?.length || 0} medications and analyzed ${Object.keys(automationResults.referralNeeds || {}).filter(k => automationResults.referralNeeds[k]).length} referral needs. Check Orders & Referrals tabs for automated workflows.`,
                        duration: 10000
                      });
                    }
                  } catch (error) {
                    console.error('Clinical automation processing error:', error);
                    // Fallback to basic extraction for reliability
                    if (soap.plan) {
                      const planText = soap.plan.toLowerCase();
                      const medications = [];
                      if (planText.includes('metformin')) medications.push('Metformin');
                      if (planText.includes('lisinopril')) medications.push('Lisinopril');
                      if (planText.includes('insulin')) medications.push('Insulin');
                      setExtractedMedications(medications);
                      
                      const referrals = {
                        homeHealth: planText.includes('home health') || planText.includes('home care'),
                        dme: planText.includes('dme') || planText.includes('medical equipment'),
                        specialist: planText.includes('specialist') || planText.includes('referral'),
                        therapy: planText.includes('therapy') || planText.includes('rehabilitation')
                      };
                      setReferralNeeds(referrals);
                    }
                  }
                }}
                onOrdersRequested={(medications) => {
                  setExtractedMedications(medications);
                  setActiveTab('orders');
                }}
                onReferralRequested={(referralData) => {
                  setReferralNeeds(referralData);
                  setActiveTab('referrals');
                }}
              />
              
              {/* Traditional AI Transcription Scribe (fallback for voice dictation) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5" />
                    Voice Dictation & Traditional Scribe
                  </CardTitle>
                  <CardDescription>
                    Use this for voice-to-text dictation when manual editing isn't sufficient
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AITranscriptionScribe />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Orders & Refills Tab - Intelligent Orders Integration */}
        <TabsContent value="orders" className="space-y-4">
          <IntelligentOrders
            selectedPatient={selectedPatient}
            extractedMedications={extractedMedications}
            soapNotes={currentSOAP}
            aiAutomationData={aiAutomationData}
            onOrderSubmitted={(order) => {
              console.log('Order submitted:', order);
              // Here you would typically update the database and refresh UI
            }}
          />
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-4">
          <IntelligentReferrals
            selectedPatient={selectedPatient}
            soapNotes={currentSOAP}
            referralNeeds={referralNeeds}
            aiAutomationData={aiAutomationData}
            onReferralSubmitted={(referral) => {
              console.log('Referral submitted:', referral);
              // Here you would typically update the database and refresh UI
            }}
          />
          {/* Legacy Referral Interface - Can be removed after testing */}
          <Card style={{ display: 'none' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                One-Click Referrals & Orders
              </CardTitle>
              <CardDescription>
                Streamlined referral management with preferred provider networks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                      <Users className="h-6 w-6" />
                      <span className="text-sm">Home Health</span>
                    </Button>
                  </DialogTrigger>
                  <OneClickReferralDialog type="home-health" />
                </Dialog>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                      <Activity className="h-6 w-6" />
                      <span className="text-sm">DME Orders</span>
                    </Button>
                  </DialogTrigger>
                  <OneClickReferralDialog type="dme" />
                </Dialog>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                      <Stethoscope className="h-6 w-6" />
                      <span className="text-sm">Specialists</span>
                    </Button>
                  </DialogTrigger>
                  <OneClickReferralDialog type="specialist" />
                </Dialog>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                      <FileText className="h-6 w-6" />
                      <span className="text-sm">Hospice Care</span>
                    </Button>
                  </DialogTrigger>
                  <OneClickReferralDialog type="hospice" />
                </Dialog>
              </div>
              
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Recent Referrals</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Home Health - Skilled Nursing</p>
                      <p className="text-xs text-muted-foreground">Patient: Mary Johnson • Sent via eFax</p>
                    </div>
                    <Badge variant="default" className="text-xs">Completed</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Cardiology Consultation</p>
                      <p className="text-xs text-muted-foreground">Patient: Robert Wilson • Pending response</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Pending</Badge>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  Smart Referral Features:
                </h4>
                <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                  <li>• Auto-fill referral forms with patient chart data</li>
                  <li>• Preferred provider network integration</li>
                  <li>• HIPAA-compliant eFax delivery via ConcordFax API</li>
                  <li>• Automated follow-up and status tracking</li>
                  <li>• Compliance logging for audit requirements</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EHR Data Upload Tab */}
        <TabsContent value="ehr-upload" className="space-y-4">
          <EHRDataUpload selectedPatient={selectedPatient} />
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="ai-recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Decision Support
              </CardTitle>
              <CardDescription>
                Intelligent recommendations based on patient data and clinical patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiRecommendations?.map((rec) => (
                  <div key={rec.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {rec.type === 'referral' && <UserCheck className="w-4 h-4" />}
                          {rec.type === 'order' && <Pill className="w-4 h-4" />}
                          {rec.type === 'documentation' && <FileText className="w-4 h-4" />}
                          {rec.type === 'alert' && <AlertTriangle className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                          
                          {/* Enhanced metadata */}
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Patient: {rec.patientName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(rec.createdAt).toLocaleDateString()}
                              </span>
                              {rec.sessionId && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  Session: {rec.sessionId.substring(0, 8)}...
                                </span>
                              )}
                            </div>
                            
                            {/* AI Analysis insight */}
                            {rec.aiAnalysis && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                                <span className="font-medium">AI Analysis:</span> {rec.aiAnalysis}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={rec.priority === 'high' ? 'destructive' : 
                          rec.priority === 'medium' ? 'default' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => {
                          // Handle review action based on recommendation type
                          if (rec.type === 'referral') {
                            setActiveTab('referrals');
                          } else if (rec.type === 'order') {
                            setActiveTab('orders');
                          } else if (rec.type === 'documentation') {
                            setActiveTab('isynera-scribe');
                          }
                        }}>
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!aiRecommendations || aiRecommendations.length === 0) && (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Recommendations</h3>
                    <p className="text-muted-foreground mb-4">
                      No recommendations available at this time
                    </p>
                    <p className="text-sm text-muted-foreground">
                      AI recommendations will appear based on:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• Patient interactions and clinical sessions</li>
                      <li>• SOAP note analysis and documentation patterns</li>
                      <li>• Medication management and safety alerts</li>
                      <li>• Follow-up care and specialist referral needs</li>
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                  AI Decision Support Features:
                </h4>
                <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                  <li>• SOAP content analysis and pattern recognition</li>
                  <li>• Historical referral behavior learning</li>
                  <li>• Payer coverage rules and compliance alerts</li>
                  <li>• Missing documentation warnings</li>
                  <li>• Custom practice protocol integration</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient Data Management Tab */}
        <TabsContent value="patient-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Patient Data Management
              </CardTitle>
              <CardDescription>
                Comprehensive patient data management with HIPAA-compliant audit logging and role-based access controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatientDataManagement />
            </CardContent>
          </Card>
        </TabsContent>

        {/* EHR Integration Tab */}
        <TabsContent value="ehr-integration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                EHR Integration & Export
              </CardTitle>
              <CardDescription>
                Export patient data and SOAP notes for EHR integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EHRIntegrationPanelSimple />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Patient Creation Dialog */}
      <Dialog open={showNewPatientDialog} onOpenChange={setShowNewPatientDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Patient</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="patientName">Patient Name *</Label>
              <Input
                id="patientName"
                value={newPatientForm.patientName}
                onChange={(e) => setNewPatientForm(prev => ({
                  ...prev,
                  patientName: e.target.value
                }))}
                placeholder="Enter patient full name"
              />
            </div>
            
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={newPatientForm.dateOfBirth}
                onChange={(e) => setNewPatientForm(prev => ({
                  ...prev,
                  dateOfBirth: e.target.value
                }))}
              />
            </div>
            
            <div>
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                value={newPatientForm.patientId}
                onChange={(e) => setNewPatientForm(prev => ({
                  ...prev,
                  patientId: e.target.value
                }))}
                placeholder="Enter patient ID (optional)"
              />
            </div>
            
            <div>
              <Label htmlFor="diagnosis">Primary Diagnosis</Label>
              <Input
                id="diagnosis"
                value={newPatientForm.diagnosis}
                onChange={(e) => setNewPatientForm(prev => ({
                  ...prev,
                  diagnosis: e.target.value
                }))}
                placeholder="Enter primary diagnosis (optional)"
              />
            </div>
            
            <div>
              <Label htmlFor="physician">Physician</Label>
              <Input
                id="physician"
                value={newPatientForm.physician}
                onChange={(e) => setNewPatientForm(prev => ({
                  ...prev,
                  physician: e.target.value
                }))}
                placeholder="Enter physician name"
              />
            </div>
            
            <div className="flex gap-2 justify-end pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowNewPatientDialog(false)}
                disabled={createPatientMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePatient}
                disabled={createPatientMutation.isPending}
              >
                {createPatientMutation.isPending ? 'Creating...' : 'Create Patient'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}