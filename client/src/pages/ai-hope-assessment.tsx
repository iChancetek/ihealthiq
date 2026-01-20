import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Heart, Brain, TrendingUp, CheckCircle2, Award } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AIHOPEAssessment() {
  const [assessmentForm, setAssessmentForm] = useState({
    patientId: "",
    clinicalData: "",
    patientReportedData: ""
  });

  const conductAssessmentMutation = useMutation({
    mutationFn: async (data: typeof assessmentForm) => {
      return await apiRequest("/api/ai/hope-assessment/conduct", {
        method: "POST",
        body: JSON.stringify({
          patientId: parseInt(data.patientId),
          clinicalData: JSON.parse(data.clinicalData || "{}"),
          patientReportedData: JSON.parse(data.patientReportedData || "{}")
        })
      });
    }
  });

  const handleConductAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (assessmentForm.patientId && assessmentForm.clinicalData) {
      conductAssessmentMutation.mutate(assessmentForm);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Heart className="h-8 w-8 text-red-500" />
          AI-Supported HOPE Clinical Decision Module
        </h1>
        <p className="text-gray-600 mt-2">
          CMS-compliant homebound assessments with AI-powered clinical decision support
        </p>
      </div>

      <Tabs defaultValue="assessment" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assessment">Conduct Assessment</TabsTrigger>
          <TabsTrigger value="results">Assessment Results</TabsTrigger>
          <TabsTrigger value="trends">Symptom Trends</TabsTrigger>
          <TabsTrigger value="compliance">CMS Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="assessment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                HOPE Assessment Intake
              </CardTitle>
              <CardDescription>
                Comprehensive assessment of cognition, physical function, psychosocial status, and home environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConductAssessment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patientId">Patient ID</Label>
                  <Input
                    id="patientId"
                    placeholder="Enter patient ID"
                    value={assessmentForm.patientId}
                    onChange={(e) => setAssessmentForm(prev => ({ ...prev, patientId: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicalData">Clinical Data (JSON)</Label>
                  <Textarea
                    id="clinicalData"
                    placeholder='{"vitals": {"bp": "120/80", "hr": 72}, "medications": ["Lisinopril 10mg"], "conditions": ["Hypertension"]}'
                    value={assessmentForm.clinicalData}
                    onChange={(e) => setAssessmentForm(prev => ({ ...prev, clinicalData: e.target.value }))}
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientReportedData">Patient Reported Data (JSON)</Label>
                  <Textarea
                    id="patientReportedData"
                    placeholder='{"mobility": "walks with walker", "adl_independence": "needs help with bathing", "pain_level": 4}'
                    value={assessmentForm.patientReportedData}
                    onChange={(e) => setAssessmentForm(prev => ({ ...prev, patientReportedData: e.target.value }))}
                    rows={6}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={conductAssessmentMutation.isPending}
                  className="w-full"
                >
                  {conductAssessmentMutation.isPending ? "Conducting Assessment..." : "Conduct HOPE Assessment"}
                </Button>
              </form>

              {conductAssessmentMutation.error && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <p className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Assessment failed. Please check your input data format.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <div className="grid gap-6">
            {conductAssessmentMutation.data && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Assessment Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {conductAssessmentMutation.data.assessmentData?.hopeData?.cognition?.score || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">Cognition Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {conductAssessmentMutation.data.assessmentData?.hopeData?.physicalFunction?.score || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">Physical Function</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {conductAssessmentMutation.data.assessmentData?.hopeData?.psychosocialStatus?.score || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">Psychosocial</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {conductAssessmentMutation.data.assessmentData?.hopeData?.homeEnvironment?.score || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">Home Environment</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Medical Reasoning</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <p className="text-sm whitespace-pre-wrap">
                        {conductAssessmentMutation.data.medicalReasoning}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Symptom Impact Rankings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conductAssessmentMutation.data.symptomImpactRanking?.map((symptom: any, index: number) => (
                      <div key={index} className="mb-4 p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{symptom.symptom}</h4>
                          <Badge variant="outline">Priority {symptom.treatmentPriority}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Severity</span>
                              <span>{symptom.severity}/10</span>
                            </div>
                            <Progress value={symptom.severity * 10} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Functional Impact</span>
                              <span>{symptom.functionalImpact}/10</span>
                            </div>
                            <Progress value={symptom.functionalImpact * 10} className="h-2" />
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{symptom.reasoning}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            {!conductAssessmentMutation.data && (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Conduct an assessment to see detailed results</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Symptom Trends Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conductAssessmentMutation.data?.symptomTrends ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800">Improving Trends</h4>
                      <p className="text-sm text-blue-600 mt-1">
                        {conductAssessmentMutation.data.symptomTrends.improving?.join(', ') || 'None identified'}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-800">Declining Trends</h4>
                      <p className="text-sm text-red-600 mt-1">
                        {conductAssessmentMutation.data.symptomTrends.declining?.join(', ') || 'None identified'}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800">Key Insights</h4>
                    <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                      {conductAssessmentMutation.data.symptomTrends.insights?.map((insight: string, index: number) => (
                        <li key={index}>{insight}</li>
                      )) || <li>No specific insights available</li>}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Complete an assessment to view symptom trends</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  CMS Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {conductAssessmentMutation.data ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>CMS Compliance Check</span>
                      <Badge variant={conductAssessmentMutation.data.cmsComplianceCheck ? "default" : "destructive"}>
                        {conductAssessmentMutation.data.cmsComplianceCheck ? "Compliant" : "Non-Compliant"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>Approval Status</span>
                      <Badge variant="secondary">
                        {conductAssessmentMutation.data.clinicianApprovalStatus || 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Complete assessment to check compliance</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Care Plan Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                {conductAssessmentMutation.data?.careplanSuggestions ? (
                  <div className="space-y-2">
                    {Object.entries(conductAssessmentMutation.data.careplanSuggestions).map(([key, value]: [string, any]) => (
                      <div key={key} className="p-2 bg-gray-50 rounded text-sm">
                        <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong>
                        <span className="ml-2">{Array.isArray(value) ? value.join(', ') : value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No care plan suggestions available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}