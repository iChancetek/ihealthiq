import { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, CheckCircle, Users, Activity, Stethoscope, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Referral form schema
const referralFormSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  referralType: z.string().min(1, "Referral type is required"),
  providerId: z.string().min(1, "Provider is required"),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  urgency: z.enum(["routine", "urgent", "stat"]),
  clinicalNotes: z.string().min(10, "Clinical notes must be at least 10 characters"),
  requestedServices: z.string().min(1, "Requested services are required")
});

type ReferralFormData = z.infer<typeof referralFormSchema>;

interface OneClickReferralDialogProps {
  type: "home-health" | "dme" | "specialist" | "hospice";
}

// Provider databases for each referral type
const PROVIDER_NETWORKS = {
  "home-health": [
    { id: "hh-001", name: "Visiting Nurse Service", specialty: "Skilled Nursing", contact: "(555) 123-4567", fax: "(555) 123-4568" },
    { id: "hh-002", name: "Home Health Plus", specialty: "Physical Therapy", contact: "(555) 234-5678", fax: "(555) 234-5679" },
    { id: "hh-003", name: "CareFirst Home Health", specialty: "Occupational Therapy", contact: "(555) 345-6789", fax: "(555) 345-6790" },
    { id: "hh-004", name: "Premier Home Care", specialty: "Speech Therapy", contact: "(555) 456-7890", fax: "(555) 456-7891" }
  ],
  "dme": [
    { id: "dme-001", name: "Medical Equipment Plus", specialty: "Mobility Equipment", contact: "(555) 111-2222", fax: "(555) 111-2223" },
    { id: "dme-002", name: "Respiratory Care Solutions", specialty: "Oxygen & CPAP", contact: "(555) 222-3333", fax: "(555) 222-3334" },
    { id: "dme-003", name: "Comfort Medical Supply", specialty: "Hospital Beds", contact: "(555) 333-4444", fax: "(555) 333-4445" },
    { id: "dme-004", name: "Independence DME", specialty: "Wheelchairs", contact: "(555) 444-5555", fax: "(555) 444-5556" }
  ],
  "specialist": [
    { id: "spec-001", name: "Dr. Sarah Mitchell", specialty: "Cardiology", contact: "(555) 777-8888", fax: "(555) 777-8889" },
    { id: "spec-002", name: "Dr. Michael Chen", specialty: "Pulmonology", contact: "(555) 888-9999", fax: "(555) 888-9990" },
    { id: "spec-003", name: "Dr. Emily Rodriguez", specialty: "Endocrinology", contact: "(555) 999-0000", fax: "(555) 999-0001" },
    { id: "spec-004", name: "Dr. James Wilson", specialty: "Nephrology", contact: "(555) 000-1111", fax: "(555) 000-1112" }
  ],
  "hospice": [
    { id: "hos-001", name: "Compassionate Care Hospice", specialty: "End-of-Life Care", contact: "(555) 555-6666", fax: "(555) 555-6667" },
    { id: "hos-002", name: "Peaceful Transitions", specialty: "Palliative Care", contact: "(555) 666-7777", fax: "(555) 666-7778" },
    { id: "hos-003", name: "Serenity Hospice Services", specialty: "Pain Management", contact: "(555) 777-8888", fax: "(555) 777-8889" },
    { id: "hos-004", name: "Grace Hospice Care", specialty: "Family Support", contact: "(555) 888-9999", fax: "(555) 888-9990" }
  ]
};

const REFERRAL_TYPE_CONFIG = {
  "home-health": {
    title: "Home Health Referral",
    description: "Order skilled nursing and therapy services",
    icon: Users,
    services: ["Skilled Nursing", "Physical Therapy", "Occupational Therapy", "Speech Therapy", "Medical Social Work"]
  },
  "dme": {
    title: "Durable Medical Equipment",
    description: "Order medical equipment and supplies",
    icon: Activity,
    services: ["Mobility Equipment", "Oxygen Therapy", "CPAP/BiPAP", "Hospital Beds", "Wound Care Supplies"]
  },
  "specialist": {
    title: "Specialist Referral",
    description: "Refer to medical specialists",
    icon: Stethoscope,
    services: ["Cardiology", "Pulmonology", "Endocrinology", "Nephrology", "Gastroenterology"]
  },
  "hospice": {
    title: "Hospice Care Referral",
    description: "Coordinate end-of-life and palliative care",
    icon: FileText,
    services: ["End-of-Life Care", "Palliative Care", "Pain Management", "Family Support", "Bereavement Services"]
  }
};

export default function OneClickReferralDialog({ type }: OneClickReferralDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const config = REFERRAL_TYPE_CONFIG[type];
  const IconComponent = config.icon;

  const form = useForm<ReferralFormData>({
    resolver: zodResolver(referralFormSchema),
    defaultValues: {
      patientId: "",
      referralType: type,
      providerId: "",
      diagnosis: "",
      urgency: "routine",
      clinicalNotes: "",
      requestedServices: ""
    }
  });

  // Fetch patients for dropdown
  const { data: patients = [] } = useQuery({
    queryKey: ['/api/patients'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate referral mutation
  const generateReferralMutation = useMutation({
    mutationFn: async (data: ReferralFormData) => {
      const response = await fetch('/api/referrals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate referral');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Referral Generated Successfully",
        description: `Referral ${data.id} has been created and sent to ${selectedProvider}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/referrals'] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Referral Generation Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ReferralFormData) => {
    const provider = PROVIDER_NETWORKS[type].find(p => p.id === data.providerId);
    setSelectedProvider(provider?.name || "");
    generateReferralMutation.mutate(data);
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <IconComponent className="h-5 w-5" />
          {config.title}
        </DialogTitle>
        <DialogDescription>
          {config.description} - Complete the form below to generate and send the referral.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Referral Form */}
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Patient Selection */}
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients.map((patient: any) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.patientName} - DOB: {patient.dateOfBirth}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Provider Selection */}
              <FormField
                control={form.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROVIDER_NETWORKS[type].map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name} - {provider.specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Diagnosis */}
              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Diagnosis</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ICD-10 code and description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Urgency */}
              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="routine">Routine (7-14 days)</SelectItem>
                        <SelectItem value="urgent">Urgent (1-3 days)</SelectItem>
                        <SelectItem value="stat">STAT (Same day)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Requested Services */}
              <FormField
                control={form.control}
                name="requestedServices"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requested Services</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {config.services.map((service) => (
                          <SelectItem key={service} value={service}>
                            {service}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Clinical Notes */}
              <FormField
                control={form.control}
                name="clinicalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinical Notes & Justification</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter clinical findings, treatment history, and medical necessity justification..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={generateReferralMutation.isPending}
              >
                {generateReferralMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Referral...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Generate & Send Referral
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Provider Network */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preferred Network</CardTitle>
              <CardDescription>
                {PROVIDER_NETWORKS[type].length} providers available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PROVIDER_NETWORKS[type].map((provider) => (
                <div key={provider.id} className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">{provider.name}</div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {provider.specialty}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-2">
                    <div>Phone: {provider.contact}</div>
                    <div>Fax: {provider.fax}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AI-Enhanced Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Auto-populate from patient records
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Insurance pre-authorization check
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Provider availability matching
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Clinical documentation assistance
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DialogContent>
  );
}