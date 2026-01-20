import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Home, User, CheckCircle, XCircle, Clock, FileText, AlertTriangle, Search, Calendar, Shield, Brain, Lightbulb, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";

const assessmentSchema = z.object({
  patientId: z.number().min(1, "Please select a patient"),
  // CMS Homebound Criteria Assessment
  mobilityLimitations: z.string().min(10, "Please describe mobility limitations in detail"),
  requiresAssistance: z.boolean(),
  leavesHomeFrequency: z.enum(["never", "rarely", "occasionally", "frequently"], {
    required_error: "Please select how often patient leaves home",
  }),
  reasonsForLeaving: z.array(z.string()).optional(),
  medicalConditions: z.string().min(10, "Please describe medical conditions"),
  expectedDuration: z.enum(["less_than_60", "60_to_180", "more_than_180"], {
    required_error: "Please select expected duration",
  }),
  // CMS-specific fields
  homeEnvironmentBarriers: z.string().optional(),
  functionalLimitations: z.string().min(5, "Describe functional limitations"),
  cognitiveStatus: z.enum(["intact", "mild_impairment", "moderate_impairment", "severe_impairment"]),
  safetyRisks: z.array(z.string()).optional(),
  caregiverAvailability: z.enum(["none", "limited", "adequate", "extensive"]),
  transportationBarriers: z.string().optional(),
  priorHospitalizations: z.string().optional(),
  additionalNotes: z.string().optional(),
});

type AssessmentForm = z.infer<typeof assessmentSchema>;

interface HomeboundAssessment {
  id: number;
  patientId: number;
  status: 'qualified' | 'not_qualified' | 'pending' | 'review_needed';
  assessmentData: any;
  aiRecommendation: {
    isHomebound: boolean;
    confidence: number;
    reasoning: string[];
    cmsCompliance: {
      criteriaEvaluation: Record<string, boolean>;
      documentationSuggestions: string[];
      riskFactors: string[];
    };
    recommendations: string[];
  };
  createdAt: string;
}

interface AIInsights {
  homeboundPrediction: {
    likelihood: number;
    factors: string[];
    concerns: string[];
  };
  cmsCompliance: {
    score: number;
    requirements: { criteria: string; met: boolean; notes: string }[];
  };
  recommendations: {
    immediate: string[];
    longTerm: string[];
    documentation: string[];
  };
}

const leavingReasons = [
  { id: "medical", label: "Medical treatment" },
  { id: "religious", label: "Religious services" },
  { id: "social", label: "Short social trips" },
  { id: "therapy", label: "Physical therapy" },
  { id: "dialysis", label: "Dialysis" },
  { id: "other", label: "Other necessary trips" },
];

const safetyRiskOptions = [
  { id: "falls", label: "Fall risk" },
  { id: "medication", label: "Medication management" },
  { id: "cognitive", label: "Cognitive impairment" },
  { id: "isolation", label: "Social isolation" },
  { id: "nutrition", label: "Nutritional deficiency" },
  { id: "environmental", label: "Environmental hazards" },
];

export default function HomeboundScreen() {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("assessment");
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['/api/patients'],
    select: (data: any[]) => data?.filter(patient => 
      patient.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patientId.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []
  });

  const { data: assessmentHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/homebound-assessments', selectedPatient?.id],
    enabled: !!selectedPatient?.id
  });

  const form = useForm<AssessmentForm>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      requiresAssistance: false,
      reasonsForLeaving: [],
      safetyRisks: [],
    },
  });

  // AI-powered assessment mutation
  const assessmentMutation = useMutation({
    mutationFn: async (data: AssessmentForm): Promise<HomeboundAssessment> => {
      return await apiRequest("/api/homebound/assess", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (result) => {
      toast({
        title: "Assessment Complete",
        description: `AI Confidence: ${result.aiRecommendation.confidence}% - ${result.status.replace('_', ' ').toUpperCase()}`
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/homebound-assessments'] });
      setActiveTab("results");
    },
    onError: (error: Error) => {
      toast({
        title: "Assessment Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // AI insights generation mutation
  const aiInsightsMutation = useMutation({
    mutationFn: async (patientData: any): Promise<AIInsights> => {
      return await apiRequest("/api/homebound/ai-insights", {
        method: "POST",
        body: JSON.stringify({ patientId: patientData.id, formData: form.getValues() })
      });
    },
    onSuccess: (insights) => {
      setAiInsights(insights);
      toast({
        title: "AI Insights Generated",
        description: `Homebound likelihood: ${insights.homeboundPrediction.likelihood}%`
      });
    }
  });

  const handlePatientSelect = (patient: any) => {
    setSelectedPatient(patient);
    form.setValue("patientId", patient.id);
    
    // Generate AI insights for selected patient
    aiInsightsMutation.mutate(patient);
  };

  const handleAssessment = (data: AssessmentForm) => {
    assessmentMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'qualified':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'not_qualified':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'not_qualified':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CMS Homebound Assessment</h1>
          <p className="text-muted-foreground">AI-powered homebound patient evaluation with CMS compliance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Brain className="h-4 w-4 mr-2" />
            AI Enhanced
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Shield className="h-4 w-4 mr-2" />
            CMS Compliant
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assessment">New Assessment</TabsTrigger>
          <TabsTrigger value="results">AI Results</TabsTrigger>
          <TabsTrigger value="history">Assessment History</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="assessment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {patientsLoading ? (
                      <div className="text-center py-4">Loading patients...</div>
                    ) : patients?.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No patients found</div>
                    ) : (
                      patients?.map((patient: any) => (
                        <Card 
                          key={patient.id}
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedPatient?.id === patient.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{patient.patientName}</p>
                                <p className="text-sm text-muted-foreground">ID: {patient.patientId}</p>
                                <p className="text-sm text-muted-foreground">DOB: {patient.dateOfBirth}</p>
                              </div>
                              {aiInsights && selectedPatient?.id === patient.id && (
                                <Badge variant="outline">
                                  AI: {aiInsights.homeboundPrediction.likelihood}%
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* AI Insights Panel */}
            {aiInsights && selectedPatient && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Homebound Likelihood</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Progress value={aiInsights.homeboundPrediction.likelihood} className="flex-1" />
                      <span className="text-sm font-medium">{aiInsights.homeboundPrediction.likelihood}%</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">CMS Compliance Score</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Progress value={aiInsights.cmsCompliance.score} className="flex-1" />
                      <span className="text-sm font-medium">{aiInsights.cmsCompliance.score}%</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Key Factors</Label>
                    <div className="space-y-1">
                      {aiInsights.homeboundPrediction.factors.slice(0, 3).map((factor, index) => (
                        <div key={index} className="text-xs p-2 bg-blue-50 rounded text-blue-800">
                          {factor}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Concerns</Label>
                    <div className="space-y-1">
                      {aiInsights.homeboundPrediction.concerns.slice(0, 2).map((concern, index) => (
                        <div key={index} className="text-xs p-2 bg-red-50 rounded text-red-800">
                          {concern}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assessment Form */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  CMS Assessment Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedPatient ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Please select a patient to begin the assessment.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAssessment)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="mobilityLimitations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobility Limitations *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe specific mobility limitations and impairments..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="functionalLimitations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Functional Limitations *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe activities of daily living limitations..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="leavesHomeFrequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequency of Leaving Home *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="never">Never</SelectItem>
                                <SelectItem value="rarely">Rarely (less than once per month)</SelectItem>
                                <SelectItem value="occasionally">Occasionally (1-3 times per month)</SelectItem>
                                <SelectItem value="frequently">Frequently (weekly or more)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cognitiveStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cognitive Status *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select cognitive status..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="intact">Intact</SelectItem>
                                <SelectItem value="mild_impairment">Mild Impairment</SelectItem>
                                <SelectItem value="moderate_impairment">Moderate Impairment</SelectItem>
                                <SelectItem value="severe_impairment">Severe Impairment</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="caregiverAvailability"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Caregiver Availability *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select availability..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="limited">Limited (occasional)</SelectItem>
                                <SelectItem value="adequate">Adequate (regular support)</SelectItem>
                                <SelectItem value="extensive">Extensive (24/7 care)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="medicalConditions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medical Conditions *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="List relevant medical conditions affecting mobility..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="expectedDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expected Duration *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select duration..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="less_than_60">Less than 60 days</SelectItem>
                                <SelectItem value="60_to_180">60-180 days</SelectItem>
                                <SelectItem value="more_than_180">More than 180 days</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={assessmentMutation.isPending}
                      >
                        {assessmentMutation.isPending ? (
                          <>
                            <Bot className="mr-2 h-4 w-4 animate-spin" />
                            AI Processing...
                          </>
                        ) : (
                          <>
                            <Brain className="mr-2 h-4 w-4" />
                            Generate AI Assessment
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {assessmentMutation.data ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  AI Assessment Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {assessmentMutation.data.aiRecommendation.confidence}%
                    </div>
                    <div className="text-sm text-muted-foreground">AI Confidence</div>
                  </div>
                  <div className="text-center">
                    <Badge className={getStatusColor(assessmentMutation.data.status)} variant="secondary">
                      {getStatusIcon(assessmentMutation.data.status)}
                      <span className="ml-2">{assessmentMutation.data.status.replace('_', ' ').toUpperCase()}</span>
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(assessmentMutation.data.aiRecommendation.cmsCompliance.criteriaEvaluation).filter(Boolean).length}
                    </div>
                    <div className="text-sm text-muted-foreground">CMS Criteria Met</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    AI Reasoning
                  </h4>
                  <div className="space-y-2">
                    {assessmentMutation.data.aiRecommendation.reasoning.map((reason: string, index: number) => (
                      <Alert key={index}>
                        <AlertDescription>{reason}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">CMS Compliance Analysis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Documentation Suggestions</Label>
                      <div className="space-y-1">
                        {assessmentMutation.data.aiRecommendation.cmsCompliance.documentationSuggestions.map((suggestion: string, index: number) => (
                          <div key={index} className="text-sm p-2 bg-blue-50 rounded text-blue-800">
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Risk Factors</Label>
                      <div className="space-y-1">
                        {assessmentMutation.data.aiRecommendation.cmsCompliance.riskFactors.map((risk: string, index: number) => (
                          <div key={index} className="text-sm p-2 bg-red-50 rounded text-red-800">
                            {risk}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">AI Recommendations</h4>
                  <div className="space-y-2">
                    {assessmentMutation.data.aiRecommendation.recommendations.map((rec: string, index: number) => (
                      <Alert key={index}>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>{rec}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Complete an assessment to view AI-generated results.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Assessment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedPatient ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Select a patient to view assessment history.
                  </AlertDescription>
                </Alert>
              ) : historyLoading ? (
                <div className="text-center py-8">Loading assessment history...</div>
              ) : !assessmentHistory || assessmentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assessment history found for this patient.
                </div>
              ) : (
                <div className="space-y-4">
                  {assessmentHistory.map((assessment: HomeboundAssessment) => (
                    <Card key={assessment.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(assessment.status)}
                              <Badge className={getStatusColor(assessment.status)} variant="secondary">
                                {assessment.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                AI Confidence: {assessment.aiRecommendation.confidence}%
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(assessment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {aiInsights ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Homebound Likelihood</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Progress value={aiInsights.homeboundPrediction.likelihood} className="flex-1" />
                      <span className="text-sm font-medium">{aiInsights.homeboundPrediction.likelihood}%</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Contributing Factors</Label>
                    <div className="space-y-1">
                      {aiInsights.homeboundPrediction.factors.map((factor, index) => (
                        <div key={index} className="text-sm p-2 bg-green-50 rounded text-green-800">
                          {factor}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Areas of Concern</Label>
                    <div className="space-y-1">
                      {aiInsights.homeboundPrediction.concerns.map((concern, index) => (
                        <div key={index} className="text-sm p-2 bg-red-50 rounded text-red-800">
                          {concern}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    CMS Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Compliance Score</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Progress value={aiInsights.cmsCompliance.score} className="flex-1" />
                      <span className="text-sm font-medium">{aiInsights.cmsCompliance.score}%</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Requirements Analysis</Label>
                    <div className="space-y-2">
                      {aiInsights.cmsCompliance.requirements.map((req, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{req.criteria}</span>
                          {req.met ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Immediate Actions</Label>
                      <div className="space-y-1">
                        {aiInsights.recommendations.immediate.map((rec, index) => (
                          <div key={index} className="text-sm p-2 bg-red-50 rounded text-red-800">
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Long-term Planning</Label>
                      <div className="space-y-1">
                        {aiInsights.recommendations.longTerm.map((rec, index) => (
                          <div key={index} className="text-sm p-2 bg-blue-50 rounded text-blue-800">
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Documentation</Label>
                      <div className="space-y-1">
                        {aiInsights.recommendations.documentation.map((rec, index) => (
                          <div key={index} className="text-sm p-2 bg-green-50 rounded text-green-800">
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Select a patient to generate AI insights and recommendations.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}