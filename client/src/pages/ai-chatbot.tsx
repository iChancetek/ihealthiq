import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  HelpCircle,
  BookOpen,
  Lightbulb,
  Zap,
  FileText,
  Shield,
  Home,
  Calendar,
  FileSignature,
  Mic,
  Brain,
  Activity,
  TrendingUp,
  Settings,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Star,
  ArrowRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedActions?: string[];
  relatedFeatures?: string[];
}

interface QuickHelp {
  category: string;
  icon: any;
  questions: string[];
}

const quickHelpCategories: QuickHelp[] = [
  {
    category: "Getting Started",
    icon: BookOpen,
    questions: [
      "How do I navigate the platform?",
      "What are the main features?",
      "How do I access patient records?",
      "Where can I find system settings?"
    ]
  },
  {
    category: "Referral Management",
    icon: FileText,
    questions: [
      "How do I submit a new referral?",
      "How does OCR document processing work?",
      "How to track referral status?",
      "What information is required for referrals?"
    ]
  },
  {
    category: "Eligibility Verification",
    icon: Shield,
    questions: [
      "How do I verify patient insurance?",
      "What insurance types are supported?",
      "How to handle verification failures?",
      "How to update insurance information?"
    ]
  },
  {
    category: "AI Features",
    icon: Brain,
    questions: [
      "How do I use the Healthcare AI Assistant?",
      "What questions can I ask the AI?",
      "How to query patient data intelligently?",
      "How to interpret AI recommendations?"
    ]
  },
  {
    category: "Voice Agent",
    icon: Mic,
    questions: [
      "How do I use voice commands?",
      "What voice features are available?",
      "How to record patient interactions?",
      "How to transcribe voice notes?"
    ]
  },
  {
    category: "Smart Scheduling",
    icon: Calendar,
    questions: [
      "How do I schedule appointments?",
      "How does smart scheduling work?",
      "How to handle appointment conflicts?",
      "How to manage patient availability?"
    ]
  },
  {
    category: "QAPI & Quality",
    icon: BarChart3,
    questions: [
      "How do I track quality metrics?",
      "What are QAPI requirements?",
      "How to generate compliance reports?",
      "How to manage quality improvement projects?"
    ]
  },
  {
    category: "Billing & Claims",
    icon: TrendingUp,
    questions: [
      "How do I submit claims?",
      "How to handle claim denials?",
      "What are billing compliance requirements?",
      "How to track revenue cycle metrics?"
    ]
  }
];

export default function AIChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your Healthcare AI Assistant. I can help you with platform navigation, patient data queries, workflow optimization, and answer questions about our advanced healthcare automation features. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch system insights
  const { data: systemInsights } = useQuery({
    queryKey: ["/api/chatbot/system-insights"],
    refetchInterval: 30000,
  });

  // Fetch workflow optimization
  const { data: workflowOptimization } = useQuery({
    queryKey: ["/api/chatbot/workflow-optimization"],
    refetchInterval: 60000,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("/api/chatbot/query", {
        method: "POST",
        body: JSON.stringify({ 
          message,
          context: "healthcare_platform_help",
          conversationHistory: messages.slice(-5)
        })
      });
    },
    onSuccess: (response) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.response || response.answer,
        timestamp: new Date(),
        suggestedActions: response.suggestedActions || [],
        relatedFeatures: response.relatedFeatures || []
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    },
    onError: (error) => {
      console.error("Chatbot error:", error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm having trouble processing your request. Please try again or contact support if the issue persists.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);
    chatMutation.mutate(inputMessage);
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Healthcare AI Assistant</h1>
          <p className="text-muted-foreground">
            Get intelligent assistance with platform features, patient data, and workflow optimization
          </p>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList>
          <TabsTrigger value="chat">Chat Assistant</TabsTrigger>
          <TabsTrigger value="insights">System Insights</TabsTrigger>
          <TabsTrigger value="optimization">Workflow Optimization</TabsTrigger>
          <TabsTrigger value="help">Quick Help</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chat Interface */}
            <div className="lg:col-span-3">
              <Card className="h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Chat with AI Assistant
                  </CardTitle>
                  <CardDescription>
                    Ask me anything about using the healthcare platform
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  {/* Messages */}
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className="space-y-2">
                          <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                message.role === 'user' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                              </div>
                              
                              <div className={`rounded-lg px-3 py-2 ${
                                message.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}>
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {message.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Suggested Actions */}
                          {message.suggestedActions && message.suggestedActions.length > 0 && (
                            <div className="ml-11 space-y-1">
                              <p className="text-xs text-gray-500">Suggested actions:</p>
                              <div className="flex flex-wrap gap-1">
                                {message.suggestedActions.map((action, index) => (
                                  <Badge key={index} variant="outline" className="text-xs cursor-pointer hover:bg-gray-100"
                                         onClick={() => handleQuickQuestion(action)}>
                                    {action}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {isTyping && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div className="bg-gray-100 rounded-lg px-3 py-2">
                            <p className="text-sm text-gray-600">AI is typing...</p>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  {/* Input */}
                  <div className="flex gap-2 pt-4">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Ask me anything about the healthcare platform..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={chatMutation.isPending}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!inputMessage.trim() || chatMutation.isPending}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Help Categories */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Help</CardTitle>
                  <CardDescription>Common questions by category</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quickHelpCategories.map((category, index) => {
                    const IconComponent = category.icon;
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center gap-2 font-medium">
                          <IconComponent className="h-4 w-4" />
                          <span className="text-sm">{category.category}</span>
                        </div>
                        <div className="space-y-1 ml-6">
                          {category.questions.slice(0, 2).map((question, qIndex) => (
                            <button
                              key={qIndex}
                              onClick={() => handleQuickQuestion(question)}
                              className="text-xs text-gray-600 hover:text-blue-600 hover:underline text-left block"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {systemInsights?.performanceMetrics && Object.entries(systemInsights.performanceMetrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <Badge variant="outline">{String(value)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {systemInsights?.systemHealth && Object.entries(systemInsights.systemHealth).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="text-sm font-medium">{String(value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {systemInsights?.aiRecommendations?.map((recommendation: string, index: number) => (
                    <div key={index} className="text-sm p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      {recommendation}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {systemInsights?.userTips?.map((tip: string, index: number) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded">
                    <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Role-Specific Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Role-Specific Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workflowOptimization?.roleSpecificTips?.map((tip: string, index: number) => (
                    <div key={index} className="text-sm p-2 bg-green-50 rounded border-l-4 border-green-400">
                      {tip}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Efficiency Gains */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Efficiency Gains
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workflowOptimization?.efficiencyGains?.map((gain: string, index: number) => (
                    <div key={index} className="text-sm p-2 bg-purple-50 rounded border-l-4 border-purple-400">
                      {gain}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Automation Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Automation Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workflowOptimization?.automationOpportunities?.map((opportunity: string, index: number) => (
                    <div key={index} className="text-sm p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                      {opportunity}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="help" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickHelpCategories.map((category, index) => {
              const IconComponent = category.icon;
              return (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5" />
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {category.questions.map((question, qIndex) => (
                        <button
                          key={qIndex}
                          onClick={() => handleQuickQuestion(question)}
                          className="text-sm text-left hover:text-blue-600 hover:underline block w-full p-2 rounded hover:bg-gray-50"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Featured AI Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle>Featured AI Capabilities</CardTitle>
              <CardDescription>Click to learn more about these advanced features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Alert className="cursor-pointer hover:bg-gray-50" onClick={() => handleQuickQuestion("How does the RAG AI Assistant work?")}>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    <strong>RAG AI Assistant</strong><br />
                    Intelligent patient data queries and clinical insights
                  </AlertDescription>
                </Alert>

                <Alert className="cursor-pointer hover:bg-gray-50" onClick={() => handleQuickQuestion("How do AI agents work?")}>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong>AI Agents</strong><br />
                    Specialized AI agents for automated healthcare workflows
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