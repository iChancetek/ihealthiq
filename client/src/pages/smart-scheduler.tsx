import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, MapPin, Clock, Star, Route } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { schedulingApi, patientApi } from "@/lib/api";

const scheduleSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  appointmentType: z.enum(["soc", "evaluation", "nursing", "therapy", "routine"], {
    required_error: "Please select appointment type",
  }),
  patientAddress: z.string().min(5, "Please enter patient address"),
  preferredDates: z.array(z.string()).min(1, "Please select at least one preferred date"),
  preferredTimes: z.array(z.string()).optional(),
  urgency: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

export default function SmartScheduler() {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  const { toast } = useToast();

  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: patientApi.getAll,
  });

  const { data: appointments } = useQuery({
    queryKey: ['/api/appointments'],
    queryFn: schedulingApi.getAppointments,
  });

  const form = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      patientId: "",
      appointmentType: "soc",
      patientAddress: "",
      preferredDates: [],
      preferredTimes: [],
      urgency: "medium",
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: async (data: ScheduleForm) => {
      const patientLocation = {
        address: data.patientAddress,
        // In a real app, you'd geocode the address
        lat: 40.7128 + (Math.random() - 0.5) * 0.1,
        lng: -74.0060 + (Math.random() - 0.5) * 0.1,
      };

      return schedulingApi.optimize({
        patientLocation,
        appointmentType: data.appointmentType,
        preferredDates: data.preferredDates,
      });
    },
    onSuccess: (data) => {
      setRecommendations(data);
      toast({
        title: "Schedule Optimized",
        description: `Found ${data.length} optimal scheduling options`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (recommendation: any) => {
      const formData = form.getValues();
      return schedulingApi.createAppointment({
        patientId: parseInt(formData.patientId),
        staffId: recommendation.staffId,
        appointmentType: formData.appointmentType,
        scheduledDate: new Date(`${recommendation.recommendedDate}T${recommendation.recommendedTime}`),
        status: 'scheduled',
        location: {
          address: formData.patientAddress,
          coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        travelDistance: `${recommendation.travelDistance.toFixed(1)} miles`,
        aiRecommendation: recommendation,
      });
    },
    onSuccess: () => {
      toast({
        title: "Appointment Scheduled",
        description: "The appointment has been successfully scheduled",
      });
      setRecommendations([]);
      setSelectedRecommendation(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Scheduling Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePatientSelect = (patientId: string) => {
    const patient = patients?.find((p: any) => p.id.toString() === patientId);
    setSelectedPatient(patient);
  };

  const onOptimize = (data: ScheduleForm) => {
    optimizeMutation.mutate(data);
  };

  const handleSchedule = (recommendation: any) => {
    setSelectedRecommendation(recommendation);
    scheduleMutation.mutate(recommendation);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAppointmentTypeLabel = (type: string) => {
    switch (type) {
      case 'soc': return 'Start of Care';
      case 'evaluation': return 'Evaluation';
      case 'nursing': return 'Nursing Visit';
      case 'therapy': return 'Therapy Session';
      case 'routine': return 'Routine Visit';
      default: return type;
    }
  };

  const preferredDates = form.watch("preferredDates") || [];

  return (
    <div className="p-6 space-y-6">
      {/* Scheduling Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>AI-Powered Schedule Optimization</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onOptimize)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handlePatientSelect(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a patient" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients?.map((patient: any) => (
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

                <FormField
                  control={form.control}
                  name="appointmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select appointment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="soc">Start of Care (SOC)</SelectItem>
                          <SelectItem value="evaluation">Evaluation</SelectItem>
                          <SelectItem value="nursing">Nursing Visit</SelectItem>
                          <SelectItem value="therapy">Therapy Session</SelectItem>
                          <SelectItem value="routine">Routine Visit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="patientAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full address for distance calculations" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="preferredDates"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Dates</FormLabel>
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <Input
                            key={i}
                            type="date"
                            onChange={(e) => {
                              if (e.target.value) {
                                const newDates = [...preferredDates];
                                newDates[i] = e.target.value;
                                field.onChange(newDates.filter(Boolean));
                              }
                            }}
                            value={preferredDates[i] || ''}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="urgent">Urgent (SOC 48hr)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={optimizeMutation.isPending}
                className="w-full md:w-auto bg-purple-600 hover:bg-purple-700"
              >
                {optimizeMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Route className="w-4 h-4 mr-2" />
                    Optimize Schedule
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5" />
              <span>AI Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    selectedRecommendation?.staffId === rec.staffId
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{rec.staffName}</h3>
                          <p className="text-sm text-gray-600">Staff ID: {rec.staffId}</p>
                        </div>
                        <Badge className={getConfidenceColor(rec.confidence)} variant="secondary">
                          {rec.confidence}% Match
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{new Date(rec.recommendedDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{rec.recommendedTime}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{rec.travelDistance.toFixed(1)} miles</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-gray-400" />
                          <span>{rec.confidence}% confidence</span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 mb-3">
                        <strong>AI Reasoning:</strong> {rec.reasoning}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSchedule(rec)}
                      disabled={scheduleMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {scheduleMutation.isPending && selectedRecommendation?.staffId === rec.staffId ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Upcoming Appointments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments && appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments
                .filter((apt: any) => new Date(apt.scheduledDate) >= new Date())
                .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                .slice(0, 5)
                .map((appointment: any) => (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Patient ID: {appointment.patientId}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {getAppointmentTypeLabel(appointment.appointmentType)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Date:</span>{' '}
                            {new Date(appointment.scheduledDate).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Time:</span>{' '}
                            {new Date(appointment.scheduledDate).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          <div>
                            <span className="font-medium">Staff:</span>{' '}
                            {appointment.staffId || 'Not assigned'}
                          </div>
                          <div>
                            <span className="font-medium">Distance:</span>{' '}
                            {appointment.travelDistance || 'N/A'}
                          </div>
                        </div>
                      </div>

                      <Badge
                        className={
                          appointment.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : appointment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                        variant="secondary"
                      >
                        {appointment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Appointments</h3>
              <p className="text-gray-500">Schedule your first appointment using the optimizer above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
