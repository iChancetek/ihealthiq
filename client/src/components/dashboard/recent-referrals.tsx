import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function RecentReferrals() {
  const { data: referrals, isLoading } = useQuery({
    queryKey: ['/api/dashboard/recent-referrals'],
  });
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Referrals</h3>
        </CardHeader>
        <CardContent>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-5 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string, ocrStatus?: string) => {
    if (ocrStatus === 'complete' && status === 'complete') return 'bg-green-100 text-green-800';
    if (status === 'processing') return 'bg-yellow-100 text-yellow-800';
    if (status === 'missing_info') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string, ocrStatus?: string) => {
    if (ocrStatus === 'complete' && status === 'complete') return 'OCR Complete';
    if (status === 'processing') return 'AI Processing';
    if (status === 'missing_info') return 'Missing Info';
    return 'Pending';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recent Referrals</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-blue-600 hover:text-blue-700"
          onClick={() => setLocation("/referral-intake")}
        >
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {referrals && referrals.length > 0 ? (
          <div className="space-y-3">
            {referrals.map((referral: any) => (
              <div key={referral.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                    <User className="text-blue-600 text-sm" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {referral.patient?.patientName || referral.extractedData?.patientName || 'Unknown Patient'}
                    </p>
                    <p className="text-sm text-gray-500">
                      DOB: {referral.patient?.dateOfBirth || referral.extractedData?.dateOfBirth || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    className={getStatusColor(referral.status, referral.ocrStatus)}
                    variant="secondary"
                  >
                    {referral.status === 'processing' && (
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse mr-1" />
                    )}
                    {getStatusText(referral.status, referral.ocrStatus)}
                  </Badge>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(referral.referralDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent referrals found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
