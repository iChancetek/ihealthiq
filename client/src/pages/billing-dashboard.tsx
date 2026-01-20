import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  Target,
  Brain,
  Zap,
  FileCheck,
  MessageSquare,
  BarChart3,
  Shield
} from "lucide-react";

interface BillingMetrics {
  totalClaims: number;
  submittedClaims: number;
  paidClaims: number;
  deniedClaims: number;
  totalDenials: number;
  pendingAppeals: number;
  approvedAppeals: number;
  totalRevenue: number;
  denialRate: string;
  averageRiskScore: string;
}

interface Claim {
  id: number;
  claimId: string;
  patientId: number;
  status: string;
  serviceDate: string;
  totalAmount: number;
  paidAmount: number;
  riskScore?: number;
  aiFlags?: string[];
  claimData?: any;
  scrubResults?: any;
}

interface ClaimGenerationData {
  patientId: number;
  appointmentId: number;
  serviceDate: string;
  serviceCodes: string[];
  diagnosisCodes: string[];
  providerId: number;
  payerId: number;
  placeOfService: string;
  authorizationNumber?: string;
  referralNumber?: string;
}

export default function BillingDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showDenialAnalysis, setShowDenialAnalysis] = useState(false);
  const [showAppealGenerator, setShowAppealGenerator] = useState(false);

  // Fetch billing metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/billing/dashboard/metrics"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch claims
  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ["/api/billing/claims"],
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  // Claim generation mutation
  const generateClaimMutation = useMutation({
    mutationFn: async (claimData: ClaimGenerationData) => {
      return await apiRequest("/api/billing/claims/generate", {
        method: "POST",
        body: JSON.stringify(claimData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AI-generated claim created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/dashboard/metrics"] });
      setShowClaimForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate claim",
        variant: "destructive"
      });
    }
  });

  // Claim validation mutation
  const validateClaimMutation = useMutation({
    mutationFn: async (claimId: number) => {
      return await apiRequest(`/api/billing/claims/${claimId}/validate`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Claim validation completed"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/claims"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to validate claim",
        variant: "destructive"
      });
    }
  });

  // Denial analysis mutation
  const analyzeDenialMutation = useMutation({
    mutationFn: async (denialData: any) => {
      return await apiRequest("/api/billing/denials/analyze", {
        method: "POST",
        body: JSON.stringify(denialData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AI denial analysis completed"
      });
      setShowDenialAnalysis(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to analyze denial",
        variant: "destructive"
      });
    }
  });

  // Appeal generation mutation
  const generateAppealMutation = useMutation({
    mutationFn: async (appealData: any) => {
      return await apiRequest("/api/billing/appeals/generate", {
        method: "POST",
        body: JSON.stringify(appealData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AI appeal letter generated successfully"
      });
      setShowAppealGenerator(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate appeal",
        variant: "destructive"
      });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'submitted': return 'bg-blue-500';
      case 'denied': return 'bg-red-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score < 30) return 'text-green-600';
    if (score < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (metricsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Brain className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">AI-Powered Billing Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">AI-Powered Billing Dashboard</h1>
            <p className="text-gray-600">Intelligent claim generation, validation, and denial management</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowClaimForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Zap className="w-4 h-4 mr-2" />
            Generate Claim
          </Button>
          <Button onClick={() => setShowDenialAnalysis(true)} variant="outline">
            <AlertCircle className="w-4 h-4 mr-2" />
            Analyze Denial
          </Button>
          <Button onClick={() => setShowAppealGenerator(true)} variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            Generate Appeal
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total Claims</span>
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.totalClaims || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Total Revenue</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-green-600">
              {formatCurrency(metrics?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600">Denial Rate</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-red-600">
              {metrics?.denialRate || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Avg Risk Score</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-yellow-600">
              {metrics?.averageRiskScore || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Pending Appeals</span>
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.pendingAppeals || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="claims">Claims Management</TabsTrigger>
          <TabsTrigger value="denials">Denial Analysis</TabsTrigger>
          <TabsTrigger value="analytics">AI Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Claim Status Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Paid Claims</span>
                    <Badge className="bg-green-500">{metrics?.paidClaims || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Submitted Claims</span>
                    <Badge className="bg-blue-500">{metrics?.submittedClaims || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Denied Claims</span>
                    <Badge className="bg-red-500">{metrics?.deniedClaims || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Processing Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI Processing Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Auto-Generated Claims</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>AI Validation Accuracy</span>
                      <span>94%</span>
                    </div>
                    <Progress value={94} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Appeal Success Rate</span>
                      <span>72%</span>
                    </div>
                    <Progress value={72} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Claims Management</CardTitle>
            </CardHeader>
            <CardContent>
              {claimsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {claims.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No claims yet</h3>
                      <p className="text-gray-600 mb-4">Generate your first AI-powered claim to get started</p>
                      <Button onClick={() => setShowClaimForm(true)}>
                        <Zap className="w-4 h-4 mr-2" />
                        Generate Claim
                      </Button>
                    </div>
                  ) : (
                    claims.map((claim: Claim) => (
                      <div key={claim.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge className={getStatusColor(claim.status)}>
                              {claim.status.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{claim.claimId}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {claim.riskScore && (
                              <Badge variant="outline" className={getRiskScoreColor(claim.riskScore)}>
                                Risk: {claim.riskScore}%
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              onClick={() => validateClaimMutation.mutate(claim.id)}
                              disabled={validateClaimMutation.isPending}
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              Validate
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Amount:</span>
                            <div className="font-medium">{formatCurrency(claim.totalAmount)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Service Date:</span>
                            <div className="font-medium">{new Date(claim.serviceDate).toLocaleDateString()}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Patient ID:</span>
                            <div className="font-medium">{claim.patientId}</div>
                          </div>
                        </div>

                        {claim.aiFlags && claim.aiFlags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {claim.aiFlags.map((flag: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="denials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Denial Analysis & Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Denial Analysis</h3>
                <p className="text-gray-600 mb-4">
                  Upload denial documents for intelligent analysis and automated remediation recommendations
                </p>
                <Button onClick={() => setShowDenialAnalysis(true)}>
                  <Brain className="w-4 h-4 mr-2" />
                  Analyze Denial
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Brain className="h-4 w-4" />
                    <AlertTitle>AI Optimization Active</AlertTitle>
                    <AlertDescription>
                      The system is continuously learning from claim outcomes to improve accuracy and reduce denial rates.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Claims Auto-Generated</span>
                      <span className="font-medium">1,247</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Validation Accuracy</span>
                      <span className="font-medium">94.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Time Saved (Hours)</span>
                      <span className="font-medium">312</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Revenue Recovery via Appeals</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(45600)}
                  </div>
                  <p className="text-sm text-gray-600">
                    AI-generated appeals have recovered significant revenue from previously denied claims.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Claim Generation Dialog */}
      <Dialog open={showClaimForm} onOpenChange={setShowClaimForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>AI Claim Generator</span>
            </DialogTitle>
          </DialogHeader>
          <ClaimGenerationForm 
            onSubmit={(data) => generateClaimMutation.mutate(data)}
            isLoading={generateClaimMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Denial Analysis Dialog */}
      <Dialog open={showDenialAnalysis} onOpenChange={setShowDenialAnalysis}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>AI Denial Analysis</span>
            </DialogTitle>
          </DialogHeader>
          <DenialAnalysisForm 
            onSubmit={(data) => analyzeDenialMutation.mutate(data)}
            isLoading={analyzeDenialMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Appeal Generator Dialog */}
      <Dialog open={showAppealGenerator} onOpenChange={setShowAppealGenerator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>AI Appeal Generator</span>
            </DialogTitle>
          </DialogHeader>
          <AppealGeneratorForm 
            onSubmit={(data) => generateAppealMutation.mutate(data)}
            isLoading={generateAppealMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Claim Generation Form Component
function ClaimGenerationForm({ onSubmit, isLoading }: { onSubmit: (data: ClaimGenerationData) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState<ClaimGenerationData>({
    patientId: 1,
    appointmentId: 1,
    serviceDate: new Date().toISOString().split('T')[0],
    serviceCodes: ['99213'],
    diagnosisCodes: ['Z00.00'],
    providerId: 1,
    payerId: 1,
    placeOfService: '11',
    authorizationNumber: '',
    referralNumber: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="patientId">Patient ID</Label>
          <Input
            id="patientId"
            type="number"
            value={formData.patientId}
            onChange={(e) => setFormData({ ...formData, patientId: parseInt(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="serviceDate">Service Date</Label>
          <Input
            id="serviceDate"
            type="date"
            value={formData.serviceDate}
            onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="serviceCodes">Service Codes (CPT/HCPCS)</Label>
        <Input
          id="serviceCodes"
          placeholder="99213, 99214"
          value={formData.serviceCodes.join(', ')}
          onChange={(e) => setFormData({ ...formData, serviceCodes: e.target.value.split(', ').filter(Boolean) })}
          required
        />
      </div>

      <div>
        <Label htmlFor="diagnosisCodes">Diagnosis Codes (ICD-10)</Label>
        <Input
          id="diagnosisCodes"
          placeholder="Z00.00, M79.3"
          value={formData.diagnosisCodes.join(', ')}
          onChange={(e) => setFormData({ ...formData, diagnosisCodes: e.target.value.split(', ').filter(Boolean) })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="placeOfService">Place of Service</Label>
          <Select value={formData.placeOfService} onValueChange={(value) => setFormData({ ...formData, placeOfService: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="11">Office</SelectItem>
              <SelectItem value="12">Home</SelectItem>
              <SelectItem value="21">Inpatient Hospital</SelectItem>
              <SelectItem value="22">Outpatient Hospital</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="authorizationNumber">Authorization Number</Label>
          <Input
            id="authorizationNumber"
            value={formData.authorizationNumber}
            onChange={(e) => setFormData({ ...formData, authorizationNumber: e.target.value })}
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Clock className="w-4 h-4 mr-2 animate-spin" />
            Generating AI Claim...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 mr-2" />
            Generate Claim
          </>
        )}
      </Button>
    </form>
  );
}

// Denial Analysis Form Component
function DenialAnalysisForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    claimId: 1,
    denialDate: new Date().toISOString().split('T')[0],
    denialReason: 'CO-97',
    denialDescription: '',
    denialAmount: 10000,
    serviceCodes: ['99213'],
    diagnosisCodes: ['Z00.00'],
    payerType: 'medicare'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="claimId">Claim ID</Label>
          <Input
            id="claimId"
            type="number"
            value={formData.claimId}
            onChange={(e) => setFormData({ ...formData, claimId: parseInt(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="denialDate">Denial Date</Label>
          <Input
            id="denialDate"
            type="date"
            value={formData.denialDate}
            onChange={(e) => setFormData({ ...formData, denialDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="denialReason">Denial Reason Code</Label>
        <Input
          id="denialReason"
          placeholder="CO-97, OA-109, PR-1"
          value={formData.denialReason}
          onChange={(e) => setFormData({ ...formData, denialReason: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="denialDescription">Denial Description</Label>
        <Textarea
          id="denialDescription"
          placeholder="Detailed description of the denial reason..."
          value={formData.denialDescription}
          onChange={(e) => setFormData({ ...formData, denialDescription: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="denialAmount">Denied Amount ($)</Label>
        <Input
          id="denialAmount"
          type="number"
          step="0.01"
          value={formData.denialAmount / 100}
          onChange={(e) => setFormData({ ...formData, denialAmount: parseFloat(e.target.value) * 100 })}
          required
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Clock className="w-4 h-4 mr-2 animate-spin" />
            Analyzing Denial...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4 mr-2" />
            Analyze Denial
          </>
        )}
      </Button>
    </form>
  );
}

// Appeal Generator Form Component
function AppealGeneratorForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    denialId: 1,
    appealType: 'reconsideration',
    regulations: ['42 CFR 424.5'],
    precedents: ['Medicare manual section 15.1'],
    supportingEvidence: ['Medical records', 'Authorization documents']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="denialId">Denial ID</Label>
          <Input
            id="denialId"
            type="number"
            value={formData.denialId}
            onChange={(e) => setFormData({ ...formData, denialId: parseInt(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="appealType">Appeal Type</Label>
          <Select value={formData.appealType} onValueChange={(value) => setFormData({ ...formData, appealType: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reconsideration">Reconsideration</SelectItem>
              <SelectItem value="redetermination">Redetermination</SelectItem>
              <SelectItem value="fair_hearing">Fair Hearing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="regulations">Supporting Regulations</Label>
        <Textarea
          id="regulations"
          placeholder="42 CFR 424.5, Medicare manual section..."
          value={formData.regulations.join('\n')}
          onChange={(e) => setFormData({ ...formData, regulations: e.target.value.split('\n').filter(Boolean) })}
        />
      </div>

      <div>
        <Label htmlFor="supportingEvidence">Supporting Evidence</Label>
        <Textarea
          id="supportingEvidence"
          placeholder="Medical records, Authorization documents..."
          value={formData.supportingEvidence.join('\n')}
          onChange={(e) => setFormData({ ...formData, supportingEvidence: e.target.value.split('\n').filter(Boolean) })}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Clock className="w-4 h-4 mr-2 animate-spin" />
            Generating Appeal...
          </>
        ) : (
          <>
            <MessageSquare className="w-4 h-4 mr-2" />
            Generate Appeal Letter
          </>
        )}
      </Button>
    </form>
  );
}