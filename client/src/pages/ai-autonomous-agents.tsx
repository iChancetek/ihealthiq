import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Bot, Zap, Clock, CheckCircle, Activity, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AIAutonomousAgents() {
  const [taskForm, setTaskForm] = useState({
    agentType: "",
    patientId: "",
    taskDescription: "",
    priority: "medium" as "low" | "medium" | "high"
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: typeof taskForm) => {
      return await apiRequest("/api/ai/autonomous-agents/create-task", {
        method: "POST",
        body: JSON.stringify({
          agentType: data.agentType,
          patientId: parseInt(data.patientId),
          taskDescription: data.taskDescription,
          priority: data.priority
        })
      });
    }
  });

  const { data: agents } = useQuery({
    queryKey: ["/api/ai-agents"],
    refetchInterval: 5000
  });

  const { data: proactiveAnalysis } = useQuery({
    queryKey: ["/api/ai-agents/proactive-analysis"],
    refetchInterval: 10000
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskForm.agentType && taskForm.patientId && taskForm.taskDescription) {
      createTaskMutation.mutate(taskForm);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bot className="h-8 w-8 text-cyan-600" />
          Autonomous AI Agents for Routine Operations
        </h1>
        <p className="text-gray-600 mt-2">
          Multi-agent task automation and collaboration for enhanced healthcare operations
        </p>
      </div>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agents">Active Agents</TabsTrigger>
          <TabsTrigger value="tasks">Task Management</TabsTrigger>
          <TabsTrigger value="proactive">Proactive Analysis</TabsTrigger>
          <TabsTrigger value="collaboration">Agent Collaboration</TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Agent Status Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(agents as any)?.agents?.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(agents as any).agents.map((agent: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{agent.name}</h4>
                          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                            {agent.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{agent.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Efficiency</span>
                            <span>{agent.efficiency}%</span>
                          </div>
                          <Progress value={agent.efficiency} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Tasks Completed: {agent.tasksCompleted}</span>
                            <span>Avg Time: {agent.averageTaskTime}s</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active agents found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {proactiveAnalysis ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span>System Status</span>
                        <Badge variant={(proactiveAnalysis as any)?.systemStatus === 'operational' ? 'default' : 'destructive'}>
                          {(proactiveAnalysis as any)?.systemStatus || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {(proactiveAnalysis as any)?.activeAgents || 0}
                          </div>
                          <div className="text-sm text-gray-500">Active Agents</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {(proactiveAnalysis as any)?.tasksInProgress || 0}
                          </div>
                          <div className="text-sm text-gray-500">Tasks in Progress</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Loading system performance data...</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Completions</CardTitle>
                </CardHeader>
                <CardContent>
                  {(proactiveAnalysis as any)?.recentCompletions?.length > 0 ? (
                    <div className="space-y-2">
                      {(proactiveAnalysis as any).recentCompletions.map((completion: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <div>
                            <p className="text-sm font-medium">{completion.task}</p>
                            <p className="text-xs text-gray-500">{completion.agent}</p>
                          </div>
                          <div className="text-xs text-green-600">
                            {completion.duration}s
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No recent completions</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Create New Task
                </CardTitle>
                <CardDescription>
                  Assign tasks to autonomous agents for automated processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="agentType">Agent Type</Label>
                      <Select value={taskForm.agentType} onValueChange={(value) => 
                        setTaskForm(prev => ({ ...prev, agentType: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select agent type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="referral-processor">Referral Processor</SelectItem>
                          <SelectItem value="eligibility-checker">Eligibility Checker</SelectItem>
                          <SelectItem value="document-analyzer">Document Analyzer</SelectItem>
                          <SelectItem value="scheduling-optimizer">Scheduling Optimizer</SelectItem>
                          <SelectItem value="compliance-monitor">Compliance Monitor</SelectItem>
                          <SelectItem value="billing-coordinator">Billing Coordinator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="patientId">Patient ID</Label>
                      <Input
                        id="patientId"
                        placeholder="Enter patient ID"
                        value={taskForm.patientId}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, patientId: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select value={taskForm.priority} onValueChange={(value: any) => 
                      setTaskForm(prev => ({ ...prev, priority: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taskDescription">Task Description</Label>
                    <Textarea
                      id="taskDescription"
                      placeholder="Describe the task for the autonomous agent to perform..."
                      value={taskForm.taskDescription}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, taskDescription: e.target.value }))}
                      rows={4}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={createTaskMutation.isPending}
                    className="w-full"
                  >
                    {createTaskMutation.isPending ? "Creating Task..." : "Assign Task to Agent"}
                  </Button>
                </form>

                {createTaskMutation.data && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-800 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Task Created Successfully
                    </h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-green-700">Task ID: {createTaskMutation.data.taskId}</p>
                      <p className="text-sm text-green-700">Assigned Agent: {createTaskMutation.data.assignedAgent}</p>
                      <p className="text-sm text-green-700">Estimated Completion: {createTaskMutation.data.estimatedCompletion}</p>
                    </div>
                  </div>
                )}

                {createTaskMutation.error && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg">
                    <p className="text-red-800 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Task creation failed. Please try again.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Queue</CardTitle>
              </CardHeader>
              <CardContent>
                {(proactiveAnalysis as any)?.taskQueue?.length > 0 ? (
                  <div className="space-y-3">
                    {(proactiveAnalysis as any).taskQueue.map((task: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{task.type}</Badge>
                            <Badge variant={
                              task.priority === 'high' ? 'destructive' :
                              task.priority === 'medium' ? 'default' : 'secondary'
                            }>
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{task.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Patient: {task.patientId}</span>
                            <span>Agent: {task.assignedAgent}</span>
                            <span>ETA: {task.estimatedCompletion}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            task.status === 'completed' ? 'default' :
                            task.status === 'in-progress' ? 'secondary' : 'outline'
                          }>
                            {task.status}
                          </Badge>
                          {task.progress && (
                            <div className="mt-2 w-20">
                              <Progress value={task.progress} className="h-1" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No tasks in queue</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="proactive">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Proactive Health Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(proactiveAnalysis as any)?.healthAlerts?.length > 0 ? (
                  <div className="space-y-3">
                    {(proactiveAnalysis as any).healthAlerts.map((alert: any, index: number) => (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        alert.severity === 'high' ? 'bg-red-50 border-red-400' :
                        alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{alert.title}</h4>
                          <Badge variant={
                            alert.severity === 'high' ? 'destructive' :
                            alert.severity === 'medium' ? 'default' : 'secondary'
                          }>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Patient: {alert.patientId}</span>
                          <span>Detected: {alert.detectedAt}</span>
                          {alert.recommendedAction && (
                            <span>Action: {alert.recommendedAction}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No health alerts detected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Trend Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {(proactiveAnalysis as any)?.trendAnalysis ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">↗ 15%</div>
                          <div className="text-sm text-gray-500">Processing Efficiency</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">↗ 8%</div>
                          <div className="text-sm text-gray-500">Patient Satisfaction</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">↘ 12%</div>
                          <div className="text-sm text-gray-500">Response Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">↗ 22%</div>
                          <div className="text-sm text-gray-500">Automation Rate</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Loading trend analysis...</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Predictive Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  {(proactiveAnalysis as any)?.predictiveInsights?.length > 0 ? (
                    <div className="space-y-2">
                      {(proactiveAnalysis as any).predictiveInsights.map((insight: string, index: number) => (
                        <div key={index} className="p-2 bg-blue-50 rounded text-sm text-blue-800">
                          {insight}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No predictive insights available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="collaboration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Agent Collaboration Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(proactiveAnalysis as any)?.collaborationMatrix ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Inter-Agent Communications</h4>
                      <div className="text-2xl font-bold text-blue-600 mb-1">147</div>
                      <div className="text-sm text-gray-500">Messages exchanged today</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Collaborative Tasks</h4>
                      <div className="text-2xl font-bold text-green-600 mb-1">23</div>
                      <div className="text-sm text-gray-500">Multi-agent tasks completed</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Active Collaborations</h4>
                    {(proactiveAnalysis as any).collaborationMatrix.activeCollaborations?.map((collab: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{collab.taskType}</h5>
                          <Badge variant="default">{collab.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Agents: {collab.agents?.join(', ')}</span>
                          <span>Progress: {collab.progress}%</span>
                        </div>
                        <Progress value={collab.progress} className="mt-2 h-2" />
                      </div>
                    )) || <p className="text-gray-500">No active collaborations</p>}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Loading collaboration data...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}