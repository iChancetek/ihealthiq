import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Brain, 
  Lightbulb, 
  Users, 
  TrendingUp, 
  AlertCircle,
  FileText,
  BarChart3,
  Activity,
  MessageSquare
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface RAGResponse {
  answer: string;
  confidence: number;
  sources: Array<{ type: string; id: string; relevance: number }>;
  relatedPatients?: any[];
  suggestedActions?: string[];
  medicalInsights?: string[];
}

interface ClinicalInsights {
  patientTrends: string[];
  riskFactors: string[];
  careGaps: string[];
  systemRecommendations: string[];
}

interface CohortAnalysis {
  matchingPatients: any[];
  insights: string[];
  recommendations: string[];
}

export default function RAGAssistant() {
  const [query, setQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Fetch patients data
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"]
  });

  // Fetch clinical insights
  const { data: clinicalInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/rag/clinical-insights"]
  });

  // RAG Query mutation
  const ragQueryMutation = useMutation({
    mutationFn: async (data: { query: string; patientId?: number }): Promise<RAGResponse> => {
      return await apiRequest("/api/rag/query", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (result: RAGResponse) => {
      console.log("RAG Query successful:", result);
    },
    onError: (error) => {
      console.error("RAG Query error:", error);
    }
  });

  // Cohort analysis mutation
  const cohortAnalysisMutation = useMutation({
    mutationFn: async (criteria: any): Promise<CohortAnalysis> => {
      return await apiRequest("/api/rag/cohort-analysis", {
        method: "POST",
        body: JSON.stringify(criteria)
      });
    }
  });

  // Patient summary mutation
  const patientSummaryMutation = useMutation({
    mutationFn: async (patientId: number): Promise<{ summary: string }> => {
      return await apiRequest("/api/rag/patient-summary", {
        method: "POST",
        body: JSON.stringify({ patientId })
      });
    }
  });

  const handleRAGQuery = () => {
    if (!query.trim()) return;
    
    ragQueryMutation.mutate({
      query: query.trim(),
      patientId: selectedPatientId || undefined
    });
  };

  const handleCohortAnalysis = (criteria: any) => {
    cohortAnalysisMutation.mutate(criteria);
  };

  const handlePatientSummary = (patientId: number) => {
    patientSummaryMutation.mutate(patientId);
  };

  const patientsArray = Array.isArray(patients) ? patients : [];
  const insightsData = clinicalInsights as ClinicalInsights || {
    patientTrends: [],
    riskFactors: [],
    careGaps: [],
    systemRecommendations: []
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Healthcare AI Assistant</h1>
          <p className="text-muted-foreground">
            Intelligent querying and analysis of patient data
          </p>
        </div>
        <Badge variant="outline" className="flex items-center space-x-2">
          <Brain className="h-4 w-4" />
          <span>AI Powered</span>
        </Badge>
      </div>

      <Tabs defaultValue="query" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="query">Query Assistant</TabsTrigger>
          <TabsTrigger value="insights">Clinical Insights</TabsTrigger>
          <TabsTrigger value="cohort">Cohort Analysis</TabsTrigger>
          <TabsTrigger value="patients">Patient Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Query Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Ask Your Question
                </CardTitle>
                <CardDescription>
                  Query patient data, medical records, and clinical insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Ask about patient trends, treatment outcomes, risk factors, or any clinical question..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[120px]"
                />

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Filter by Patient (Optional)
                  </label>
                  <select
                    value={selectedPatientId || ""}
                    onChange={(e) => setSelectedPatientId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="">All Patients</option>
                    {patientsArray.map((patient: any) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.patientName} - {patient.diagnosis}
                      </option>
                    ))}
                  </select>
                </div>

                <Button 
                  onClick={handleRAGQuery}
                  disabled={ragQueryMutation.isPending}
                  className="w-full"
                >
                  {ragQueryMutation.isPending ? (
                    <>
                      <Search className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Query Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Response Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  AI Response
                </CardTitle>
                <CardDescription>
                  Intelligent analysis and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ragQueryMutation.data ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        Confidence: {ragQueryMutation.data.confidence}%
                      </Badge>
                      <Progress value={ragQueryMutation.data.confidence} className="w-24" />
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Answer</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {ragQueryMutation.data.answer}
                      </p>
                    </div>

                    {ragQueryMutation.data.medicalInsights && ragQueryMutation.data.medicalInsights.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-2">Medical Insights</h4>
                          <div className="space-y-2">
                            {ragQueryMutation.data.medicalInsights.map((insight: string, index: number) => (
                              <Alert key={index}>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{insight}</AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {ragQueryMutation.data.suggestedActions && ragQueryMutation.data.suggestedActions.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-2">Suggested Actions</h4>
                          <ul className="space-y-1">
                            {ragQueryMutation.data.suggestedActions.map((action: string, index: number) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Data Sources</h4>
                      <div className="text-xs text-muted-foreground">
                        {ragQueryMutation.data.sources?.slice(0, 3).map((source: any, index: number) => (
                          <div key={index} className="truncate">
                            {typeof source === 'string' ? source : `${source.type}: ${source.id} (${(source.relevance * 100).toFixed(0)}%)`}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Ask a question to get AI-powered insights from your healthcare data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {insightsLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Patient Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insightsData.patientTrends.map((trend, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-blue-500">•</span>
                        {trend}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insightsData.riskFactors.map((risk, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Care Gaps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insightsData.careGaps.map((gap, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-yellow-500">•</span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insightsData.systemRecommendations.map((rec, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-green-500">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cohort" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Cohort Analysis
              </CardTitle>
              <CardDescription>
                Analyze patient groups based on specific criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Button 
                  onClick={() => handleCohortAnalysis({ type: 'high-risk' })}
                  disabled={cohortAnalysisMutation.isPending}
                  variant="outline"
                >
                  Analyze High-Risk Patients
                </Button>
                <Button 
                  onClick={() => handleCohortAnalysis({ type: 'readmission' })}
                  disabled={cohortAnalysisMutation.isPending}
                  variant="outline"
                >
                  Readmission Risk Analysis
                </Button>
              </div>

              {cohortAnalysisMutation.data && (
                <div className="mt-4 p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Analysis Results</h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      Found {cohortAnalysisMutation.data.matchingPatients?.length || 0} matching patients
                    </p>
                    {cohortAnalysisMutation.data.insights?.map((insight: string, index: number) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        • {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Patient Overview
              </CardTitle>
              <CardDescription>
                Quick access to patient summaries and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patientsArray.map((patient: any) => (
                  <Card key={patient.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{patient.patientName}</h4>
                          <p className="text-sm text-muted-foreground">{patient.diagnosis}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {patient.priority || 'Standard'}
                        </Badge>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePatientSummary(patient.id)}
                        disabled={patientSummaryMutation.isPending}
                        className="w-full"
                      >
                        Generate Summary
                      </Button>

                      {patientSummaryMutation.data && (
                        <div className="mt-3 p-3 bg-muted rounded text-xs">
                          <ScrollArea className="h-20">
                            {patientSummaryMutation.data.summary}
                          </ScrollArea>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}