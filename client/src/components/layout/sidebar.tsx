import { Link, useLocation } from "wouter";
import { 
  Gauge, FileText, Shield, Home, Calendar, 
  FileSignature, Mic, UserPlus, Bot 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { path: "/", label: "Dashboard", icon: Gauge },
  { path: "/referral-intake", label: "Referral Intake", icon: FileText },
  { path: "/eligibility-check", label: "Eligibility Check", icon: Shield },
  { path: "/homebound-screen", label: "Homebound Screen", icon: Home },
  { path: "/smart-scheduler", label: "Smart Scheduler", icon: Calendar },
  { path: "/consent-rights", label: "Consent & Rights", icon: FileSignature },
  { path: "/voice-agent", label: "Voice Agent", icon: Mic },
  { path: "/ai-agents", label: "AI Agents", icon: Bot },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <UserPlus className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AI Healthcare</h1>
            <p className="text-sm text-gray-500">Intake Platform</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors",
                isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
