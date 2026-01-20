import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AutonomousIntakeScreen from './src/screens/ai/AutonomousIntakeScreen';
import TranscriptionScribeScreen from './src/screens/ai/TranscriptionScribeScreen';
import ReferralSummaryScreen from './src/screens/ai/ReferralSummaryScreen';
import HopeAssessmentScreen from './src/screens/ai/HopeAssessmentScreen';
import ChartReviewScreen from './src/screens/ai/ChartReviewScreen';
import AutonomousAgentsScreen from './src/screens/ai/AutonomousAgentsScreen';
import FieldOperationsScreen from './src/screens/field/FieldOperationsScreen';
import PatientVisitScreen from './src/screens/field/PatientVisitScreen';
import DocumentProcessingScreen from './src/screens/core/DocumentProcessingScreen';
import EligibilityCheckScreen from './src/screens/core/EligibilityCheckScreen';
import BillingDashboardScreen from './src/screens/core/BillingDashboardScreen';
import SmartSchedulerScreen from './src/screens/core/SmartSchedulerScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Theme
import { theme } from './src/theme/theme';

// Auth Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'AI Modules':
              iconName = 'psychology';
              break;
            case 'Field Ops':
              iconName = 'location-on';
              break;
            case 'Documents':
              iconName = 'folder-open';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="AI Modules" component={AIModulesNavigator} />
      <Tab.Screen name="Field Ops" component={FieldNavigator} />
      <Tab.Screen name="Documents" component={DocumentProcessingScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AIModulesNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="AIModulesList" 
        component={AIModulesListScreen} 
        options={{ title: 'AI Healthcare Modules' }}
      />
      <Stack.Screen 
        name="AutonomousIntake" 
        component={AutonomousIntakeScreen} 
        options={{ title: 'Autonomous Intake' }}
      />
      <Stack.Screen 
        name="TranscriptionScribe" 
        component={TranscriptionScribeScreen} 
        options={{ title: 'iSynera Scribe' }}
      />
      <Stack.Screen 
        name="ReferralSummary" 
        component={ReferralSummaryScreen} 
        options={{ title: 'Referral Summary' }}
      />
      <Stack.Screen 
        name="HopeAssessment" 
        component={HopeAssessmentScreen} 
        options={{ title: 'HOPE Assessment' }}
      />
      <Stack.Screen 
        name="ChartReview" 
        component={ChartReviewScreen} 
        options={{ title: 'Chart Review & Coding' }}
      />
      <Stack.Screen 
        name="AutonomousAgents" 
        component={AutonomousAgentsScreen} 
        options={{ title: 'Autonomous AI Agents' }}
      />
    </Stack.Navigator>
  );
}

function FieldNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="FieldOperations" 
        component={FieldOperationsScreen} 
        options={{ title: 'Field Operations' }}
      />
      <Stack.Screen 
        name="PatientVisit" 
        component={PatientVisitScreen} 
        options={{ title: 'Patient Visit' }}
      />
    </Stack.Navigator>
  );
}

function AIModulesListScreen({ navigation }) {
  const aiModules = [
    { 
      id: 1, 
      title: 'Autonomous Intake Engine', 
      description: 'AI-powered document processing and patient intake automation',
      screen: 'AutonomousIntake',
      icon: 'auto-awesome'
    },
    { 
      id: 2, 
      title: 'iSynera Scribe', 
      description: 'Real-time medical transcription with SOAP note generation',
      screen: 'TranscriptionScribe',
      icon: 'mic'
    },
    { 
      id: 3, 
      title: 'Referral Summary Generator', 
      description: 'Intelligent clinical overview with risk stratification',
      screen: 'ReferralSummary',
      icon: 'summarize'
    },
    { 
      id: 4, 
      title: 'HOPE Assessment AI', 
      description: 'CMS-compliant homebound status determination',
      screen: 'HopeAssessment',
      icon: 'favorite'
    },
    { 
      id: 5, 
      title: 'Chart Review & Coding', 
      description: 'Medical coding validation and compliance assistance',
      screen: 'ChartReview',
      icon: 'fact-check'
    },
    { 
      id: 6, 
      title: 'Autonomous AI Agents', 
      description: 'Multi-agent task automation and collaboration',
      screen: 'AutonomousAgents',
      icon: 'smart-toy'
    }
  ];

  return (
    <div className="p-4">
      {aiModules.map((module) => (
        <div 
          key={module.id}
          className="mb-4 p-4 bg-white rounded-lg shadow cursor-pointer"
          onClick={() => navigation.navigate(module.screen)}
        >
          <div className="flex items-center">
            <Icon name={module.icon} size={24} color={theme.colors.primary} />
            <div className="ml-3">
              <h3 className="text-lg font-semibold">{module.title}</h3>
              <p className="text-gray-600">{module.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 justify-center items-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <TabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <StatusBar style="auto" />
            <AppContent />
          </AuthProvider>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}