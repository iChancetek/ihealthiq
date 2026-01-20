import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Shield, Calendar, Bot, TrendingUp, Clock, CheckCircle, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function MetricsGrid() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
  });
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-12 w-12 rounded-lg mb-4" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-4" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: "Active Referrals",
      value: metrics?.activeReferrals || 0,
      icon: FileText,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: "+12% from last week",
      trendUp: true,
      path: "/referral-intake"
    },
    {
      title: "Pending Verifications",
      value: metrics?.pendingVerifications || 0,
      icon: Shield,
      iconColor: "text-amber-600",
      bgColor: "bg-amber-50",
      trend: "Avg 2.3hrs processing",
      isTime: true,
      path: "/eligibility-check"
    },
    {
      title: "Scheduled Visits",
      value: metrics?.scheduledVisits || 0,
      icon: Calendar,
      iconColor: "text-green-600",
      bgColor: "bg-green-50",
      trend: "98% completion rate",
      isSuccess: true,
      path: "/smart-scheduler"
    },
    {
      title: "AI Processing",
      value: metrics?.aiProcessing || 0,
      icon: Bot,
      iconColor: "text-teal-600",
      bgColor: "bg-teal-50",
      trend: "Real-time processing",
      isActive: true,
      path: "/ai-agents"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metricCards.map((metric, index) => (
        <Card 
          key={index} 
          className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setLocation(metric.path)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
              <div className={`w-12 h-12 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                <metric.icon className={`${metric.iconColor} text-xl`} />
              </div>
            </div>
            <div className="flex items-center text-sm">
              {metric.trendUp && <TrendingUp className="text-green-600 text-xs mr-1" />}
              {metric.isTime && <Clock className="text-amber-600 text-xs mr-1" />}
              {metric.isSuccess && <CheckCircle className="text-green-600 text-xs mr-1" />}
              {metric.isActive && <Activity className="text-teal-600 text-xs mr-1 animate-pulse" />}
              <span className={
                metric.trendUp ? "text-green-600" : 
                metric.isTime ? "text-amber-600" : 
                metric.isSuccess ? "text-green-600" : 
                metric.isActive ? "text-teal-600" : 
                "text-gray-600"
              }>
                {metric.trend}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
