import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Shield, Home, Calendar } from "lucide-react";
import { useLocation } from "wouter";

const agents = [
  {
    name: "OCR Processing",
    status: "active",
    description: "Active - 2 documents queued",
    icon: Eye,
    color: "green",
    path: "/referral-intake"
  },
  {
    name: "Eligibility Verification",
    status: "processing",
    description: "Processing - 3 checks in progress",
    icon: Shield,
    color: "blue",
    path: "/eligibility-check"
  },
  {
    name: "Homebound Screener",
    status: "ready",
    description: "Ready - CMS rules loaded",
    icon: Home,
    color: "teal",
    path: "/homebound-screen"
  },
  {
    name: "Smart Scheduler",
    status: "optimizing",
    description: "Optimizing - 5 assignments pending",
    icon: Calendar,
    color: "purple",
    path: "/smart-scheduler"
  }
];

const getColorClasses = (color: string) => {
  const colors: Record<string, { bg: string; border: string; text: string; icon: string; dot: string }> = {
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-900",
      icon: "text-green-600",
      dot: "bg-green-500"
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      icon: "text-blue-600",
      dot: "bg-blue-500"
    },
    teal: {
      bg: "bg-teal-50",
      border: "border-teal-200",
      text: "text-teal-900",
      icon: "text-teal-600",
      dot: "bg-teal-500"
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-900",
      icon: "text-purple-600",
      dot: "bg-purple-500"
    }
  };
  return colors[color] || colors.green;
};

export default function AIAgentStatus() {
  const [, setLocation] = useLocation();

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">AI Agent Status</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agents.map((agent, index) => {
            const colors = getColorClasses(agent.color);
            const isProcessing = agent.status === 'processing' || agent.status === 'optimizing';
            
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-4 ${colors.bg} rounded-lg border ${colors.border} cursor-pointer hover:shadow-sm transition-shadow`}
                onClick={() => setLocation(agent.path)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 ${colors.dot} rounded-full ${isProcessing ? 'animate-pulse' : ''}`}></div>
                  <div>
                    <p className={`font-medium ${colors.text}`}>{agent.name}</p>
                    <p className={`text-sm ${colors.icon}`}>{agent.description}</p>
                  </div>
                </div>
                <agent.icon className={`${colors.icon} w-5 h-5`} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
