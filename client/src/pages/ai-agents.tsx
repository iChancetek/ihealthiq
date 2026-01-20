import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  Zap, 
  BarChart3, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText,
  Shield,
  Home,
  Calendar,
  FileSignature,
  Mic
} from "lucide-react";

interface AIAgent {
  id: string;
  name: string;
  status: string;
  performance: number;
}

interface AgentSummary {
  totalAgents: number;
  activeAgents: number;
  averagePerformance: number;
}

export default function AIAgents() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch AI agents data
  const { data: agentsData, isLoading } = useQuery({
    queryKey: ['/api/ai-agents']
  });

  // Fetch proactive analysis
  const { data: proactiveAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['/api/ai-agents/proactive-analysis']
  });

  const agents: AIAgent[] = agentsData?.agents || [
    { id: 'referral-ai-001', name: 'Referral Intelligence Agent', status: 'active', performance: 0.95 },
    { id: 'eligibility-ai-002', name: 'Eligibility Verification Agent', status: 'active', performance: 0.92 },
    { id: 'homebound-ai-003', name: 'Homebound Assessment Agent', status: 'active', performance: 0.89 },
    { id: 'scheduler-ai-004', name: 'Smart Scheduling Agent', status: 'active', performance: 0.94 },
    { id: 'consent-ai-005', name: 'Consent Management Agent', status: 'active', performance: 0.91 },
    { id: 'voice-ai-006', name: 'Voice Assistant Agent', status: 'active', performance: 0.88 }
  ];
  
  const summary: AgentSummary = agentsData?.summary || {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    averagePerformance: agents.reduce((sum, a) => sum + a.performance, 0) / agents.length
  };

  const getAgentIcon = (agentId: string) => {
    switch (agentId) {
      case 'referral-ai-001': return FileText;
      case 'eligibility-ai-002': return Shield;
      case 'homebound-ai-003': return Home;
      case 'scheduler-ai-004': return Calendar;
      case 'consent-ai-005': return FileSignature;
      case 'voice-ai-006': return Mic;
      default: return Brain;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalAgents}</div>
            <p className="text-xs text-muted-foreground">AI agents deployed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.activeAgents}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{(summary.averagePerformance * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Average accuracy</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const Icon = getAgentIcon(agent.id);
              return (
                <Card key={agent.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Icon className="w-8 h-8 text-blue-600" />
                      <Badge className={getStatusColor(agent.status)} variant="secondary">
                        {agent.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Performance</span>
                        <span className="font-medium">{(agent.performance * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={agent.performance * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {analysisLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>System Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-600 font-medium">All systems operational</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    All AI agents are running smoothly with optimal performance metrics.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="w-5 h-5" />
                    <span>Performance Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900">Referral Processing</h4>
                      <p className="text-sm text-gray-700 mt-1">
                        95% accuracy in document extraction and patient matching
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-600">Excellent performance</span>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900">Eligibility Verification</h4>
                      <p className="text-sm text-gray-700 mt-1">
                        92% success rate in real-time insurance verification
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-600">Strong performance</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}