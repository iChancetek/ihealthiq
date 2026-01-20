import { useLocation } from "wouter";
import { User, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoice } from "@/hooks/use-voice";

const pageTitle: Record<string, string> = {
  "/": "Dashboard",
  "/referral-intake": "Referral Intake",
  "/eligibility-check": "Eligibility Verification",
  "/homebound-screen": "Homebound Screening",
  "/smart-scheduler": "Smart Scheduler",
  "/consent-rights": "Consent & Rights Management",
  "/voice-agent": "Voice AI Assistant"
};

const pageDescription: Record<string, string> = {
  "/": "AI-powered healthcare intake management",
  "/referral-intake": "Process and manage patient referrals with OCR",
  "/eligibility-check": "Verify insurance eligibility and benefits",
  "/homebound-screen": "Assess CMS homebound compliance",
  "/smart-scheduler": "Optimize appointments with AI scheduling",
  "/consent-rights": "Manage digital consent forms and patient rights",
  "/voice-agent": "Interactive voice AI for healthcare workflows"
};

export default function Header() {
  const [location] = useLocation();
  const { isVoiceActive, toggleVoice } = useVoice();

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
            <div className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-teal-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className={`text-sm font-medium ${isVoiceActive ? 'text-teal-700' : 'text-gray-600'}`}>
              {isVoiceActive ? 'Voice AI Active' : 'Voice AI Inactive'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleVoice}
              className="ml-2 p-1 hover:bg-teal-100 rounded"
            >
              <Mic className={`w-4 h-4 ${isVoiceActive ? 'text-teal-600' : 'text-gray-600'}`} />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-600">
            <User className="w-8 h-8" />
            <span className="font-medium">Dr. Sarah Johnson</span>
          </div>
        </div>
      </div>
    </header>
  );
}
