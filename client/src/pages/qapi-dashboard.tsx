import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Users, FileText, 
  Target, Activity, Shield, Brain, Download, Calendar, Filter, Search, Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface QAPIMetrics {
  patientFalls: { count: number; trend: number; riskLevel: 'low' | 'medium' | 'high' | 'critical' };
  infections: { count: number; trend: number; riskLevel: 'low' | 'medium' | 'high' | 'critical' };
  wounds: { count: number; trend: number; riskLevel: 'low' | 'medium' | 'high' | 'critical' };
  missedVisits: { count: number; trend: number; riskLevel: 'low' | 'medium' | 'high' | 'critical' };
  readmissions: { count: number; trend: number; riskLevel: 'low' | 'medium' | 'high' | 'critical' };
  copRisks: Array<{
    area: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    aiConfidence: number;
  }>;
  overallScore: number;
  aiValidationStatus: 'verified' | 'flagged' | 'pending';
}

interface PerformanceData {
  date: string;
  falls: number;
  infections: number;
  wounds: number;
  missedVisits: number;
  readmissions: number;
  clinicianPerformance?: number;
}

interface PIPProject {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planning' | 'active' | 'monitoring' | 'completed';
  assignedTo: string;
  dueDate: string;
  progress: number;
  aiRecommendation: string;
  tasks: Array<{
    id: string;
    description: string;
    completed: boolean;
    assignee: string;
    dueDate: string;
  }>;
}

export default function QAPIDashboard() {
  const [timeFrame, setTimeFrame] = useState("30");
  const [selectedView, setSelectedView] = useState("overview");
  const [filterCriteria, setFilterCriteria] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: qapiMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/qapi/metrics', timeFrame],
    refetchInterval: 30000, // Real-time updates every 30 seconds
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['/api/qapi/performance', timeFrame],
    refetchInterval: 60000,
  });

  const { data: pipProjects, isLoading: pipLoading } = useQuery({
    queryKey: ['/api/qapi/pip-projects'],
    refetchInterval: 30000,
  });

  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ['/api/qapi/compliance'],
    refetchInterval: 30000,
  });

  const generateReportMutation = useMutation({
    mutationFn: async ({ timeFrame, format }: { timeFrame: string; format: string }) => {
      return await apiRequest('/api/qapi/generate-report', {
        method: 'POST',
        body: JSON.stringify({ timeFrame, format }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generated Successfully",
        description: "QAPI report has been generated and is ready for download.",
      });
      // Create download link for the report
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qapi-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: () => {
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate QAPI report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // AI Data Validation Mutation
  const validateDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/qapi/validate-data", {
        method: "POST",
        body: JSON.stringify({ timeFrame, validate: true })
      });
    },
    onSuccess: (result) => {
      toast({
        title: "AI Validation Complete",
        description: `Data integrity confirmed with ${result.confidence}% confidence`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/qapi/metrics'] });
    }
  });



  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QAPI Dashboard</h1>
          <p className="text-muted-foreground">Quality Assurance & Performance Improvement with AI Validation</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="px-3 py-1">
              <Brain className="h-4 w-4 mr-2" />
              AI Verified
            </Badge>
            {qapiMetrics?.aiValidationStatus === 'flagged' && (
              <Badge variant="destructive" className="px-3 py-1">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Data Issues Detected
              </Badge>
            )}
          </div>
          <Select value={timeFrame} onValueChange={setTimeFrame}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="365">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => validateDataMutation.mutate()}
            disabled={validateDataMutation.isPending}
            variant="outline"
          >
            <Brain className="h-4 w-4 mr-2" />
            {validateDataMutation.isPending ? 'Validating...' : 'AI Validate'}
          </Button>
          <Button 
            onClick={() => generateReportMutation.mutate('pdf')}
            disabled={generateReportMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Quality Metrics</TabsTrigger>
          <TabsTrigger value="pip">PIP Projects</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {qapiMetrics && Object.entries(qapiMetrics)
              .filter(([key]) => ['patientFalls', 'infections', 'wounds', 'missedVisits', 'readmissions'].includes(key))
              .map(([key, value]: [string, any]) => (
              <Card key={key}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </p>
                      <p className="text-2xl font-bold">{value.count}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {getTrendIcon(value.trend)}
                      <Badge className={getRiskColor(value.riskLevel)} variant="secondary">
                        {value.riskLevel}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overall Score and CoP Risks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Overall QAPI Score</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{qapiMetrics?.overallScore || 0}%</span>
                    <Badge className={qapiMetrics?.overallScore >= 85 ? 'bg-green-100 text-green-800' : 
                                    qapiMetrics?.overallScore >= 70 ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-red-100 text-red-800'} variant="secondary">
                      {qapiMetrics?.overallScore >= 85 ? 'Excellent' :
                       qapiMetrics?.overallScore >= 70 ? 'Good' : 'Needs Improvement'}
                    </Badge>
                  </div>
                  <Progress value={qapiMetrics?.overallScore || 0} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    AI-calculated composite score based on all quality indicators
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>CoP Risk Areas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {qapiMetrics?.copRisks?.map((risk, index) => (
                      <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{risk.area}</p>
                          <p className="text-sm text-muted-foreground">{risk.description}</p>
                          <p className="text-xs text-blue-600 mt-1">AI Confidence: {risk.aiConfidence}%</p>
                        </div>
                        <Badge className={getRiskColor(risk.riskLevel)} variant="secondary">
                          {risk.riskLevel}
                        </Badge>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-2" />
                        <p>No critical CoP risks identified</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Quality Metrics Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceData && performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="falls" stroke="#8884d8" name="Patient Falls" />
                    <Line type="monotone" dataKey="infections" stroke="#82ca9d" name="Infections" />
                    <Line type="monotone" dataKey="wounds" stroke="#ffc658" name="Wounds" />
                    <Line type="monotone" dataKey="missedVisits" stroke="#ff7300" name="Missed Visits" />
                    <Line type="monotone" dataKey="readmissions" stroke="#ff0000" name="Readmissions" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4" />
                  <p>Loading performance trends...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quality Indicators Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceData && performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Falls', value: performanceData[performanceData.length - 1]?.falls || 0 },
                          { name: 'Infections', value: performanceData[performanceData.length - 1]?.infections || 0 },
                          { name: 'Wounds', value: performanceData[performanceData.length - 1]?.wounds || 0 },
                          { name: 'Missed Visits', value: performanceData[performanceData.length - 1]?.missedVisits || 0 },
                          { name: 'Readmissions', value: performanceData[performanceData.length - 1]?.readmissions || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {performanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">Loading chart data...</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clinician Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceData && performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="clinicianPerformance" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.6}
                        name="Performance Score"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">Loading performance data...</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PIP Projects Tab */}
        <TabsContent value="pip" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Performance Improvement Projects</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pipProjects && pipProjects.length > 0 ? (
                <div className="space-y-4">
                  {pipProjects.map((project: PIPProject) => (
                    <Card key={project.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold">{project.title}</h3>
                              <Badge className={getRiskColor(project.priority)} variant="secondary">
                                {project.priority}
                              </Badge>
                              <Badge variant="outline">{project.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{project.aiRecommendation}</p>
                            <div className="flex items-center space-x-4 text-sm">
                              <span>Assigned to: {project.assignedTo}</span>
                              <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                            </div>
                            <div className="mt-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">Progress</span>
                                <span className="text-sm">{project.progress}%</span>
                              </div>
                              <Progress value={project.progress} className="w-full" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4" />
                  <p>No active PIP projects</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Staff Compliance Monitor</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complianceData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{complianceData.onTime || 0}</p>
                        <p className="text-sm text-muted-foreground">On Time</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{complianceData.overdue || 0}</p>
                        <p className="text-sm text-muted-foreground">Overdue</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {complianceData.alerts?.map((alert: any, index: number) => (
                        <Alert key={index}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{alert.message}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">Loading compliance data...</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Documentation Timeliness</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complianceData?.documentation && (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={complianceData.documentation}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="onTime" fill="#82ca9d" name="On Time" />
                      <Bar dataKey="late" fill="#ff7300" name="Late" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Automated QAPI Reporting</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => generateReportMutation.mutate({ timeFrame, format: 'pdf' })}
                    disabled={generateReportMutation.isPending}
                    className="h-20 flex flex-col space-y-2"
                  >
                    <Download className="h-6 w-6" />
                    <span>Monthly PDF Report</span>
                  </Button>
                  <Button 
                    onClick={() => generateReportMutation.mutate({ timeFrame, format: 'excel' })}
                    disabled={generateReportMutation.isPending}
                    variant="outline"
                    className="h-20 flex flex-col space-y-2"
                  >
                    <FileText className="h-6 w-6" />
                    <span>Excel Analytics</span>
                  </Button>
                  <Button 
                    onClick={() => generateReportMutation.mutate({ timeFrame, format: 'surveyor' })}
                    disabled={generateReportMutation.isPending}
                    variant="outline"
                    className="h-20 flex flex-col space-y-2"
                  >
                    <Shield className="h-6 w-6" />
                    <span>Surveyor Package</span>
                  </Button>
                </div>

                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    All reports include AI-generated root cause analysis and improvement recommendations.
                    Data integrity verified before generation.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}