import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, FAB, Chip, Avatar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiRequest } from '../../services/api';
import { theme } from '../../theme/theme';

interface PatientVisit {
  id: number;
  patientName: string;
  address: string;
  scheduledTime: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'urgent' | 'high' | 'medium';
  visitType: string;
  estimatedDuration: number;
}

interface FieldStaff {
  id: number;
  name: string;
  role: string;
  territory: string;
  isActive: boolean;
}

export default function FieldOperationsScreen({ navigation }) {
  const [selectedStaffId, setSelectedStaffId] = useState<number>(1);
  const [activeVisitId, setActiveVisitId] = useState<number | null>(null);

  // Fetch field staff
  const { data: fieldStaff = [] } = useQuery({
    queryKey: ['/api/field-staff'],
    queryFn: () => apiRequest('/api/field-staff'),
  });

  // Fetch today's visits for selected staff
  const { data: visits = [], refetch } = useQuery({
    queryKey: ['/api/field-staff', selectedStaffId, 'visits'],
    queryFn: () => apiRequest(`/api/field-staff/${selectedStaffId}/visits/today`),
    enabled: !!selectedStaffId,
  });

  const currentStaff = fieldStaff.find(staff => staff.id === selectedStaffId);

  const handleStartVisit = async (visitId: number) => {
    try {
      await apiRequest(`/api/visits/${visitId}/start`, {
        method: 'POST',
        body: { 
          staffId: selectedStaffId,
          startTime: new Date().toISOString(),
          gpsLocation: await getCurrentLocation(),
        },
      });
      setActiveVisitId(visitId);
      refetch();
      
      navigation.navigate('PatientVisit', { visitId });
    } catch (error) {
      Alert.alert('Error', 'Failed to start visit');
    }
  };

  const getCurrentLocation = async () => {
    // GPS location logic would go here
    return { latitude: 40.7128, longitude: -74.0060 };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'schedule';
      case 'in-progress': return 'play-circle-filled';
      case 'completed': return 'check-circle';
      default: return 'help';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with staff selection */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.staffHeader}>
            <Avatar.Icon 
              size={48} 
              icon="person" 
              style={{ backgroundColor: theme.colors.primary }}
            />
            <View style={styles.staffInfo}>
              <Text variant="titleLarge">{currentStaff?.name}</Text>
              <Text variant="bodyMedium" style={styles.roleText}>
                {currentStaff?.role} • {currentStaff?.territory}
              </Text>
            </View>
            <Chip 
              icon="location-on" 
              mode="outlined"
              textStyle={{ color: theme.colors.primary }}
            >
              Active
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Today's Statistics */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Today's Schedule
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={styles.statNumber}>
                {visits.length}
              </Text>
              <Text variant="bodySmall">Total Visits</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statNumber, { color: theme.colors.success }]}>
                {visits.filter(v => v.status === 'completed').length}
              </Text>
              <Text variant="bodySmall">Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statNumber, { color: theme.colors.warning }]}>
                {visits.filter(v => v.status === 'pending').length}
              </Text>
              <Text variant="bodySmall">Pending</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Visits List */}
      <ScrollView style={styles.visitsList}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Patient Visits
        </Text>
        
        {visits.map((visit: PatientVisit) => (
          <Card key={visit.id} style={styles.visitCard}>
            <Card.Content>
              <View style={styles.visitHeader}>
                <View style={styles.visitInfo}>
                  <Text variant="titleMedium">{visit.patientName}</Text>
                  <Text variant="bodyMedium" style={styles.visitTime}>
                    📅 {new Date(visit.scheduledTime).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                  <Text variant="bodySmall" style={styles.visitAddress}>
                    📍 {visit.address}
                  </Text>
                </View>
                
                <View style={styles.visitBadges}>
                  <Chip 
                    mode="outlined" 
                    style={[styles.priorityChip, { borderColor: getStatusColor(visit.priority) }]}
                    textStyle={{ color: getStatusColor(visit.priority) }}
                  >
                    {visit.priority.toUpperCase()}
                  </Chip>
                  
                  <View style={styles.statusRow}>
                    <Icon 
                      name={getStatusIcon(visit.status)} 
                      size={16} 
                      color={getStatusColor(visit.status)} 
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(visit.status) }]}>
                      {visit.status.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.visitDetails}>
                <Text variant="bodySmall">
                  🩺 {visit.visitType} • ⏱️ {visit.estimatedDuration} mins
                </Text>
              </View>
              
              <View style={styles.visitActions}>
                {visit.status === 'pending' && (
                  <Button 
                    mode="contained" 
                    onPress={() => handleStartVisit(visit.id)}
                    style={styles.actionButton}
                  >
                    Start Visit
                  </Button>
                )}
                {visit.status === 'in-progress' && (
                  <Button 
                    mode="outlined" 
                    onPress={() => navigation.navigate('PatientVisit', { visitId: visit.id })}
                    style={styles.actionButton}
                  >
                    Continue Visit
                  </Button>
                )}
                {visit.status === 'completed' && (
                  <Button 
                    mode="text" 
                    onPress={() => navigation.navigate('PatientVisit', { visitId: visit.id })}
                    style={styles.actionButton}
                  >
                    View Summary
                  </Button>
                )}
                
                <Button 
                  mode="outlined" 
                  icon="navigation"
                  onPress={() => {/* Open navigation */}}
                  style={styles.navButton}
                >
                  Navigate
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="add"
        style={styles.fab}
        onPress={() => navigation.navigate('AddVisit')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffInfo: {
    flex: 1,
    marginLeft: 12,
  },
  roleText: {
    color: theme.colors.placeholder,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  visitsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  visitCard: {
    marginBottom: 12,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visitInfo: {
    flex: 1,
  },
  visitTime: {
    color: theme.colors.primary,
    marginTop: 2,
  },
  visitAddress: {
    color: theme.colors.placeholder,
    marginTop: 2,
  },
  visitBadges: {
    alignItems: 'flex-end',
  },
  priorityChip: {
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  visitDetails: {
    marginBottom: 12,
  },
  visitActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginRight: 8,
  },
  navButton: {
    minWidth: 100,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});