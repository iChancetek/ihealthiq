import MetricsGrid from "@/components/dashboard/metrics-grid";
import RecentReferrals from "@/components/dashboard/recent-referrals";
import AIAgentStatus from "@/components/dashboard/ai-agent-status";
import TaskQueue from "@/components/dashboard/task-queue";

export default function Dashboard() {
  return (
    <div className="p-6">
      <MetricsGrid />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RecentReferrals />
        <AIAgentStatus />
      </div>

      <TaskQueue />
    </div>
  );
}
