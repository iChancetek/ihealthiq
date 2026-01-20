import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import ReferralIntake from "@/pages/referral-intake";
import EligibilityCheck from "@/pages/eligibility-check";
import HomeboundScreen from "@/pages/homebound-screen";
import SmartScheduler from "@/pages/smart-scheduler";
import ConsentRights from "@/pages/consent-rights";
import VoiceAgent from "@/pages/voice-agent";
import AIAgents from "@/pages/ai-agents";
import RAGAssistant from "@/pages/rag-assistant";
import Login from "@/pages/auth/login";

import AIChatbot from "@/pages/ai-chatbot";
import QAPIDashboard from "@/pages/qapi-dashboard";
import BillingDashboard from "@/pages/billing-dashboard";
import IntakeAutomation from "@/pages/intake-automation";
import AutonomousIntake from "@/pages/autonomous-intake";
import AIReferralAcceleration from "@/pages/ai-referral-acceleration";
import AITranscriptionScribe from "@/pages/ai-transcription-scribe-working";
import AIReferralSummary from "@/pages/ai-referral-summary";
import AIHOPEAssessment from "@/pages/ai-hope-assessment";
import AIChartReview from "@/pages/ai-chart-review";
import AIAutonomousAgents from "@/pages/ai-autonomous-agents";
import AdminManagement from "@/pages/admin-management";
import DoctorDashboard from "@/pages/doctor-dashboard";
import NurseSessions from "@/pages/nurse-sessions";
import HopeSessions from "@/pages/hope-sessions";
import DocumentProcessing from "@/pages/document-processing";
import RecycleArea from "@/pages/recycle-area";
import Downloads from "@/pages/downloads";
import MobileFieldApp from "@/pages/mobile-field-app";
import MyAiIntakeResults from "@/pages/my-ai-intake-results";
import PrescriptionsRefills from "@/pages/prescriptions-refills";
import NotFound from "@/pages/not-found";
import { Link, useLocation } from "wouter";
import { 
  Gauge, FileText, Shield, Home, Calendar, 
  FileSignature, Mic, UserPlus, Bot, Target, DollarSign,
  Zap, Heart, FileCheck, Activity, Brain, Users, FolderOpen, Trash2, Download, Stethoscope, Pill
} from "lucide-react";
import { cn } from "@/lib/utils";

const allNavigationItems = [
  { path: "/", label: "Dashboard", icon: Gauge, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/autonomous-intake", label: "Hyper-Intelligent Intake", icon: Bot, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  
  // Six Generative AI Modules
  { path: "/ai-referral-acceleration", label: "AI Referral Acceleration", icon: Zap, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/ai-transcription-scribe", label: "iSynera Scribe", icon: Mic, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician", "doctor"] },
  { path: "/nurse-sessions", label: "Nurse Sessions", icon: FileText, roles: ["admin", "administrator", "nurse"] },
  { path: "/my-ai-intake-results", label: "My AI Intake Results", icon: FileCheck, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/ai-referral-summary", label: "Referral Summary Generator", icon: FileText, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/ai-hope-assessment", label: "HOPE Assessment AI", icon: Heart, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/hope-sessions", label: "HOPE Sessions", icon: Heart, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/ai-chart-review", label: "Chart Review + Coding", icon: FileCheck, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/ai-autonomous-agents", label: "Autonomous AI Agents", icon: Activity, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  
  // Admin Management
  { path: "/admin-management", label: "Admin Management", icon: Shield, roles: ["admin", "administrator"] },
  { path: "/doctor-dashboard", label: "Doctor Dashboard", icon: Stethoscope, roles: ["admin", "administrator", "doctor"] },
  
  // Core Healthcare Modules
  { path: "/mobile-field-app", label: "📱 Mobile Field App", icon: Users, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/document-processing", label: "Document Processing", icon: FolderOpen, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/referral-intake", label: "Referral Intake", icon: FileText, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/eligibility-check", label: "Eligibility Check", icon: Shield, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/homebound-screen", label: "Homebound Screen", icon: Home, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/qapi-dashboard", label: "QAPI Dashboard", icon: Target, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/billing-dashboard", label: "AI Billing Manager", icon: DollarSign, roles: ["admin", "administrator", "clinical_staff"] },
  { path: "/prescriptions-refills", label: "Prescriptions & Refills", icon: Pill, roles: ["admin", "administrator", "physician", "doctor"] },
  { path: "/smart-scheduler", label: "Smart Scheduler", icon: Calendar, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/consent-rights", label: "Consent & Rights", icon: FileSignature, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/voice-agent", label: "Voice Agent", icon: Mic, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/ai-agents", label: "AI Agents", icon: Bot, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/rag-assistant", label: "Healthcare AI Assistant", icon: Brain, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/ai-chatbot", label: "AI Help Assistant", icon: Users, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
  { path: "/recycle-area", label: "Recycle Area", icon: Trash2, roles: ["admin", "administrator"] },
  { path: "/downloads", label: "Documentation Downloads", icon: Download, roles: ["admin", "administrator", "clinical_staff", "nurse", "physician"] },
];

// Doctor-specific navigation items (only what doctors should see)
const doctorNavigationItems = [
  { path: "/doctor-dashboard", label: "Doctor Dashboard", icon: Stethoscope },
];

function getNavigationItems(userRole: string) {
  if (userRole === "doctor") {
    return doctorNavigationItems;
  }
  
  return allNavigationItems.filter(item => 
    item.roles.includes(userRole)
  );
}

function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const userRole = (user as any)?.role || "admin";
  const navigationItems = getNavigationItems(userRole);

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <UserPlus className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">iSynera AI</h1>
            <p className="text-sm text-gray-500">Healthcare Platform</p>
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

const pageTitle: Record<string, string> = {
  "/": "Dashboard",
  "/referral-intake": "Referral Intake",
  "/eligibility-check": "Eligibility Verification",
  "/homebound-screen": "Homebound Screening",
  "/smart-scheduler": "Smart Scheduler",
  "/consent-rights": "Consent & Rights Management",
  "/voice-agent": "Voice AI Assistant",
  "/ai-agents": "AI Agents",
  "/rag-assistant": "Healthcare AI Assistant"
};

const pageDescription: Record<string, string> = {
  "/": "AI-powered healthcare intake management",
  "/referral-intake": "Process and manage patient referrals with OCR",
  "/eligibility-check": "Verify insurance eligibility and benefits",
  "/homebound-screen": "Assess CMS homebound compliance",
  "/smart-scheduler": "Optimize appointments with AI scheduling",
  "/consent-rights": "Manage digital consent forms and patient rights",
  "/voice-agent": "Interactive voice AI for healthcare workflows",
  "/ai-agents": "Manage specialized AI agents",
  "/rag-assistant": "Intelligent healthcare data queries and analysis"
};

function Header() {
  const [location] = useLocation();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {pageTitle[location] || "Healthcare Platform"}
          </h2>
          <p className="text-gray-600">
            {pageDescription[location] || "AI-powered healthcare management"}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-4 py-2 bg-teal-50 rounded-lg">
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-teal-700">System Active</span>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-600">
            <UserPlus className="w-8 h-8" />
            <span className="font-medium">Healthcare Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// Role-based route protection component
function ProtectedRoute({ component: Component, allowedRoles, userRole, ...props }: any) {
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-auto">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page. This page is restricted to specific roles.
          </p>
          <p className="text-sm text-gray-500">
            Your role: <span className="font-medium text-gray-700">{userRole}</span>
          </p>
        </div>
      </div>
    );
  }
  return <Component {...props} />;
}

function AuthenticatedApp() {
  const { logout, user } = useAuth();
  const [location] = useLocation();
  const userRole = (user as any)?.role || "admin";

  // Auto-redirect doctors to their dashboard if they try to access other pages
  if (userRole === "doctor" && location !== "/doctor-dashboard" && location !== "/ai-transcription-scribe") {
    window.location.href = "/doctor-dashboard";
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Healthcare Platform
              </h2>
              <p className="text-gray-600">
                AI-powered healthcare management
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-teal-50 rounded-lg">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-teal-700">System Active</span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-600">
                <UserPlus className="w-8 h-8" />
                <span className="font-medium">{(user as any)?.username || "User"}</span>
                <span className="text-sm text-gray-500">({userRole})</span>
                <button onClick={logout} className="ml-2 text-red-600 hover:text-red-800">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Switch>
            <Route path="/">
              <ProtectedRoute 
                component={Dashboard} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/autonomous-intake">
              <ProtectedRoute 
                component={AutonomousIntake} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            
            {/* Six Generative AI Modules */}
            <Route path="/ai-referral-acceleration">
              <ProtectedRoute 
                component={AIReferralAcceleration} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/ai-transcription-scribe">
              <ProtectedRoute 
                component={AITranscriptionScribe} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician", "doctor"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/nurse-sessions">
              <ProtectedRoute 
                component={NurseSessions} 
                allowedRoles={["admin", "administrator", "nurse"]} 
                userRole={userRole} 
              />
            </Route>
            
            {/* Admin Management */}
            <Route path="/admin-management">
              <ProtectedRoute 
                component={AdminManagement} 
                allowedRoles={["admin", "administrator"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/doctor-dashboard">
              <ProtectedRoute 
                component={DoctorDashboard} 
                allowedRoles={["admin", "administrator", "doctor"]} 
                userRole={userRole} 
              />
            </Route>
            
            {/* Core Healthcare Modules - Protected */}
            <Route path="/my-ai-intake-results">
              <ProtectedRoute 
                component={MyAiIntakeResults} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/ai-referral-summary">
              <ProtectedRoute 
                component={AIReferralSummary} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/ai-hope-assessment">
              <ProtectedRoute 
                component={AIHOPEAssessment} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/hope-sessions">
              <ProtectedRoute 
                component={HopeSessions} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/ai-chart-review">
              <ProtectedRoute 
                component={AIChartReview} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/ai-autonomous-agents">
              <ProtectedRoute 
                component={AIAutonomousAgents} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/prescriptions-refills">
              <ProtectedRoute 
                component={PrescriptionsRefills} 
                allowedRoles={["admin", "administrator", "physician", "doctor"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/document-processing">
              <ProtectedRoute 
                component={DocumentProcessing} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/referral-intake">
              <ProtectedRoute 
                component={ReferralIntake} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/eligibility-check">
              <ProtectedRoute 
                component={EligibilityCheck} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/homebound-screen">
              <ProtectedRoute 
                component={HomeboundScreen} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/qapi-dashboard">
              <ProtectedRoute 
                component={QAPIDashboard} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/billing-dashboard">
              <ProtectedRoute 
                component={BillingDashboard} 
                allowedRoles={["admin", "administrator", "clinical_staff"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/smart-scheduler">
              <ProtectedRoute 
                component={SmartScheduler} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/consent-rights">
              <ProtectedRoute 
                component={ConsentRights} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/voice-agent">
              <ProtectedRoute 
                component={VoiceAgent} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/ai-agents">
              <ProtectedRoute 
                component={AIAgents} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/rag-assistant">
              <ProtectedRoute 
                component={RAGAssistant} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/ai-chatbot">
              <ProtectedRoute 
                component={AIChatbot} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/recycle-area">
              <ProtectedRoute 
                component={RecycleArea} 
                allowedRoles={["admin", "administrator"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/downloads">
              <ProtectedRoute 
                component={Downloads} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route path="/mobile-field-app">
              <ProtectedRoute 
                component={MobileFieldApp} 
                allowedRoles={["admin", "administrator", "clinical_staff", "nurse", "physician"]} 
                userRole={userRole} 
              />
            </Route>
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthWrapper />
      <Toaster />
    </QueryClientProvider>
  );
}

function AuthWrapper() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !location.startsWith('/auth/')) {
    return <Login />;
  }

  if (location.startsWith('/auth/') && isAuthenticated) {
    window.location.href = '/';
    return null;
  }

  return (
    <Switch>
      <Route path="/auth/login" component={Login} />
      <Route component={AuthenticatedApp} />
    </Switch>
  );
}

export default App;