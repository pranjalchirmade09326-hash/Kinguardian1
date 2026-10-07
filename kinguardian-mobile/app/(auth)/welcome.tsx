import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../src/store/AppContext';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { authService } from '../../src/services/auth/authService';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Users, ChevronRight, Sparkles } from 'lucide-react-native';

export default function WelcomeRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    
    const checkAuth = async () => {
      try {
        const session = await authService.getStoredSession();
        if (session) {
          setIsAuthenticated(true);
          if (session.user.role === 'parent') {
            router.replace('/(parent)');
          } else {
            router.replace('/(coordinator)');
          }
        } else {
          setAuthChecked(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [router]);

  if (!context) return null;

  if (isAuthenticated) return null;

  if (authChecked && !showOnboarding) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom', 'left', 'right']}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          className="bg-white px-6"
        >
          {/* Hero Section */}
          <View className="items-center mt-6 mb-8">
            <View className="w-20 h-20 rounded-3xl bg-blue-50 items-center justify-center border border-blue-100 mb-4 shadow-xs">
              <Text className="text-4xl">🛡️</Text>
            </View>
            <Text className="text-3xl font-bold text-slate-900 tracking-tight">
              KinGuardian
            </Text>
            <Text className="text-sm text-slate-500 text-center mt-2 leading-relaxed max-w-xs">
              Family healthcare coordination made simple
            </Text>
          </View>

          {/* Features */}
          <View className="space-y-3 mb-8">
            <View className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex-row items-center">
              <View className="w-11 h-11 rounded-xl bg-blue-100 items-center justify-center mr-3.5">
                <Shield size={22} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900">Secure Family Care</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Protected healthcare coordination</Text>
              </View>
            </View>

            <View className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex-row items-center">
              <View className="w-11 h-11 rounded-xl bg-emerald-100 items-center justify-center mr-3.5">
                <Users size={22} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900">Family Circle</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Connect with your loved ones</Text>
              </View>
            </View>

            <View className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex-row items-center">
              <View className="w-11 h-11 rounded-xl bg-amber-100 items-center justify-center mr-3.5">
                <Sparkles size={22} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900">AI-Powered Insights</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Smart health monitoring & alerts</Text>
              </View>
            </View>
          </View>

          {/* CTA Buttons */}
          <View className="space-y-3">
            <TouchableOpacity
              testID="welcome-get-started-button"
              onPress={() => setShowOnboarding(true)}
              className="bg-blue-600 py-3.5 rounded-xl items-center justify-center active:scale-98 shadow-sm"
            >
              <View className="flex-row items-center justify-center">
                <Text className="text-white font-bold text-sm mr-2">Get Started</Text>
                <ChevronRight size={18} color="white" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              testID="welcome-sign-in-button"
              onPress={() => router.replace('/(auth)/sign-in')}
              className="bg-white border border-slate-200 py-3.5 rounded-xl items-center justify-center active:bg-slate-50"
            >
              <Text className="text-slate-800 font-semibold text-sm">Sign In to Existing Account</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="mt-8 items-center">
            <Text className="text-xs text-slate-400">Your family's health, simplified</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onComplete={(_config) => {
          context.setCurrentScreen('health_dashboard');
          context.showToast('Onboarding complete! Welcome to Coordinator Home.');
          router.replace('/(coordinator)');
        }}
      />
    );
  }

  return null;
}
