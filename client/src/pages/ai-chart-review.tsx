import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, FileCheck, Code, Shield, TrendingUp, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AIChartReview() {
  const [reviewForm, setReviewForm] = useState({
    patientId: "",
    chartDocuments: ""
  });

  const [codingSuggestionForm, setCodingSuggestionForm] = useState({
    documentationText: "",
    contextualCodes: ""
  });

  const conductReviewMutation = useMutation({
    mutationFn: async (data: typeof reviewForm) => {
      return await apiRequest("/api/ai/chart-review/conduct", {
        method: "POST",
        body: JSON.stringify({
          patientId: parseInt(data.patientId),
          chartDocuments: data.chartDocuments.split('\n').filter(doc => doc.trim())
        })
      });
    }
  });

  const codingSuggestionMutation = useMutation({
    mutationFn: async (data: typeof codingSuggestionForm) => {
      return await apiRequest("/api/ai/chart-review/coding-suggestions", {
        method: "POST",
        body: JSON.stringify({
          documentationText: data.documentationText,
          contextualCodes: JSON.parse(data.contextualCodes || "[]")
        })
      });
    }
  });

  const handleConductReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewForm.patientId && reviewForm.chartDocuments) {
      conductReviewMutation.mutate(reviewForm);
    }
  };

  const handleGetCodingSuggestions = (e: React.FormEvent) => {
    e.preventDefault();
    if (codingSuggestionForm.documentationText) {
      codingSuggestionMutation.mutate(codingSuggestionForm);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileCheck className="h-8 w-8 text-green-600" />
          Generative Chart Review + AI Coding Assistant
        </h1>
        <p className="text-gray-600 mt-2">
          Medical coding validation and compliance checking with AI-powered chart analysis
        </p>
      </div>

      <Tabs defaultValue="review" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="review">Chart Review</TabsTrigger>
          <TabsTrigger value="coding">Coding Assistant</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Check</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Comprehensive Chart Review
              </CardTitle>
              <CardDescription>
                AI-powered analysis of medical charts for coding accuracy and compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConductReview} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patientId">Patient ID</Label>
                  <Input
                    id="patientId"
                    placeholder="Enter patient ID"
                    value={reviewForm.patientId}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, patientId: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chartDocuments">Chart Documents (one per line)</Label>
                  <Textarea
                    id="chartDocuments"
                    placeholder="Enter chart documentation text, one document per line..."
                    value={reviewForm.chartDocuments}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, chartDocuments: e.target.value }))}
                    rows={10}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={conductReviewMutation.isPending}
                  className="w-full"
                >
                  {conductReviewMutation.isPending ? "Analyzing Charts..." : "Conduct Chart Review"}
                </Button>
              </form>

              {conductReviewMutation.data && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-800 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Chart Review Complete
                    </h3>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-green-600">Coding Confidence:</span>
                        <div className="flex items-center gap-2">
                          <Progress value={conductReviewMutation.data.codingConfidenceScore} className="flex-1 h-2" />
                          <span className="text-sm font-medium">{conductReviewMutation.data.codingConfidenceScore}%</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-green-600">Reimbursement Accuracy:</span>
                        <div className="flex items-center gap-2">
                          <Progress value={conductReviewMutation.data.reimbursementAccuracy} className="flex-1 h-2" />
                          <span className="text-sm font-medium">{conductReviewMutation.data.reimbursementAccuracy}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Extracted Medical Codes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {conductReviewMutation.data.extractedCodes?.codes?.length > 0 ? (
                        <div className="space-y-2">
                          {conductReviewMutation.data.extractedCodes.codes.map((code: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{code.type}</Badge>
                                <span className="font-mono">{code.code}</span>
                                <span className="text-sm text-gray-600">{code.description}</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {code.confidence}% confidence
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No medical codes extracted yet</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {conductReviewMutation.error && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <p className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Chart review failed. Please try again.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Real-time Coding Assistant
              </CardTitle>
              <CardDescription>
                Get instant coding suggestions while documenting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGetCodingSuggestions} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="documentationText">Clinical Documentation</Label>
                  <Textarea
                    id="documentationText"
                    placeholder="Enter clinical documentation text..."
                    value={codingSuggestionForm.documentationText}
                    onChange={(e) => setCodingSuggestionForm(prev => ({ ...prev, documentationText: e.target.value }))}
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contextualCodes">Existing Codes (JSON)</Label>
                  <Textarea
                    id="contextualCodes"
                    placeholder='[{"type": "ICD-10", "code": "I10", "description": "Essential hypertension"}]'
                    value={codingSuggestionForm.contextualCodes}
                    onChange={(e) => setCodingSuggestionForm(prev => ({ ...prev, contextualCodes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={codingSuggestionMutation.isPending}
                  className="w-full"
                >
                  {codingSuggestionMutation.isPending ? "Analyzing..." : "Get Coding Suggestions"}
                </Button>
              </form>

              {codingSuggestionMutation.data && (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Suggested Codes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {codingSuggestionMutation.data.suggestedCodes?.length > 0 ? (
                          <div className="space-y-2">
                            {codingSuggestionMutation.data.suggestedCodes.map((code: any, index: number) => (
                              <div key={index} className="p-2 bg-blue-50 rounded">
                                <div className="flex items-center gap-2">
                                  <Badge>{code.type}</Badge>
                                  <span className="font-mono text-sm">{code.code}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{code.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Progress value={code.confidence} className="flex-1 h-1" />
                                  <span className="text-xs">{code.confidence}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No code suggestions available</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Warnings & Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {codingSuggestionMutation.data.warnings?.length > 0 ? (
                            codingSuggestionMutation.data.warnings.map((warning: string, index: number) => (
                              <div key={index} className="p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                                {warning}
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500">No warnings</p>
                          )}
                          
                          {codingSuggestionMutation.data.recommendations?.length > 0 ? (
                            codingSuggestionMutation.data.recommendations.map((rec: string, index: number) => (
                              <div key={index} className="p-2 bg-green-50 rounded text-sm text-green-800">
                                {rec}
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500">No specific recommendations</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conductReviewMutation.data?.complianceValidation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${conductReviewMutation.data.complianceValidation.cms_guidelines ? 'text-green-600' : 'text-red-600'}`}>
                        {conductReviewMutation.data.complianceValidation.cms_guidelines ? '✓' : '✗'}
                      </div>
                      <div className="text-sm text-gray-500">CMS Guidelines</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${conductReviewMutation.data.complianceValidation.coding_standards ? 'text-green-600' : 'text-red-600'}`}>
                        {conductReviewMutation.data.complianceValidation.coding_standards ? '✓' : '✗'}
                      </div>
                      <div className="text-sm text-gray-500">Coding Standards</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${conductReviewMutation.data.complianceValidation.medical_necessity ? 'text-green-600' : 'text-red-600'}`}>
                        {conductReviewMutation.data.complianceValidation.medical_necessity ? '✓' : '✗'}
                      </div>
                      <div className="text-sm text-gray-500">Medical Necessity</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${conductReviewMutation.data.complianceValidation.documentation_adequacy ? 'text-green-600' : 'text-red-600'}`}>
                        {conductReviewMutation.data.complianceValidation.documentation_adequacy ? '✓' : '✗'}
                      </div>
                      <div className="text-sm text-gray-500">Documentation</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${conductReviewMutation.data.complianceValidation.billing_accuracy ? 'text-green-600' : 'text-red-600'}`}>
                        {conductReviewMutation.data.complianceValidation.billing_accuracy ? '✓' : '✗'}
                      </div>
                      <div className="text-sm text-gray-500">Billing Accuracy</div>
                    </div>
                  </div>

                  {conductReviewMutation.data.complianceValidation.issues?.length > 0 && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">Compliance Issues</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {conductReviewMutation.data.complianceValidation.issues.map((issue: string, index: number) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Conduct a chart review to see compliance validation</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Coding Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Overall Accuracy</span>
                    <span>94%</span>
                  </div>
                  <Progress value={94} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Compliance Rate</span>
                    <span>97%</span>
                  </div>
                  <Progress value={97} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Documentation Quality</span>
                    <span>91%</span>
                  </div>
                  <Progress value={91} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">2,847</div>
                    <div className="text-sm text-gray-500">Charts Reviewed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">156</div>
                    <div className="text-sm text-gray-500">Discrepancies Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">94.5%</div>
                    <div className="text-sm text-gray-500">Accuracy Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">2.3s</div>
                    <div className="text-sm text-gray-500">Avg Review Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}