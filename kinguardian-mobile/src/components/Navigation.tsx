import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Users, Sparkles, Activity, User, Pill, Mic } from 'lucide-react-native';
import { ActiveTab, ScreenView } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  currentScreen: ScreenView;
  onTabChange: (tab: ActiveTab) => void;
  onOpenQuickActions: () => void;
  onOpenAskAI: () => void;
}

export const BottomNavBar: React.FC<NavigationProps> = ({
  activeTab,
  currentScreen,
  onTabChange,
  onOpenAskAI
}) => {
  const insets = useSafeAreaInsets();
  if (currentScreen === 'onboarding') return null;

  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <View
      style={{ paddingBottom: bottomPadding }}
      className="absolute bottom-0 left-0 right-0 z-40 bg-white/98 border-t border-slate-200/80 flex-row justify-around items-center pt-2 px-1 shadow-lg"
    >
      {/* Tab 1: Home */}
      <TouchableOpacity
        onPress={() => onTabChange('home')}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <Home size={21} color={activeTab === 'home' ? '#2563eb' : '#94a3b8'} />
        <Text
          className={`text-[10px] font-medium mt-1 ${activeTab === 'home' ? 'text-blue-600 font-bold' : 'text-slate-400'
            }`}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Parents */}
      <TouchableOpacity
        onPress={() => onTabChange('parents')}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <Users size={21} color={activeTab === 'parents' ? '#2563eb' : '#94a3b8'} />
        <Text
          className={`text-[10px] font-medium mt-1 ${activeTab === 'parents' ? 'text-blue-600 font-bold' : 'text-slate-400'
            }`}
        >
          Parents
        </Text>
      </TouchableOpacity>

      {/* Tab 3: Ask AI (Center Action Button) */}
      <TouchableOpacity
        onPress={onOpenAskAI}
        activeOpacity={0.8}
        className="flex-1 items-center justify-center -mt-4"
      >
        <View className="w-11 h-11 rounded-full bg-blue-600 items-center justify-center shadow-md border-2 border-white active:scale-95">
          <Sparkles size={18} color="#ffffff" />
        </View>
        <Text className="text-[10px] font-bold text-blue-600 mt-0.5">Ask AI</Text>
      </TouchableOpacity>

      {/* Tab 4: Care */}
      <TouchableOpacity
        onPress={() => onTabChange('care')}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <Activity size={21} color={activeTab === 'care' ? '#2563eb' : '#94a3b8'} />
        <Text
          className={`text-[10px] font-medium mt-1 ${activeTab === 'care' ? 'text-blue-600 font-bold' : 'text-slate-400'
            }`}
        >
          Care
        </Text>
      </TouchableOpacity>

      {/* Tab 5: Profile */}
      <TouchableOpacity
        onPress={() => onTabChange('profile')}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <User size={21} color={activeTab === 'profile' ? '#2563eb' : '#94a3b8'} />
        <Text
          className={`text-[10px] font-medium mt-1 ${activeTab === 'profile' ? 'text-blue-600 font-bold' : 'text-slate-400'
            }`}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

interface ParentNavigationProps {
  activeTab: 'home' | 'medicines' | 'ask' | 'profile';
  onTabChange: (tab: 'home' | 'medicines' | 'ask' | 'profile') => void;
}

export const ParentBottomNavBar: React.FC<ParentNavigationProps> = ({ activeTab, onTabChange }) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <View
      style={{ paddingBottom: bottomPadding }}
      className="absolute bottom-0 left-0 right-0 z-40 bg-white/98 border-t border-slate-200/80 flex-row justify-around items-center pt-2 px-2 shadow-lg"
    >
      <TouchableOpacity
        onPress={() => onTabChange('home')}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <Home size={23} color={activeTab === 'home' ? '#2563eb' : '#94a3b8'} />
        <Text
          className={`text-[11px] font-medium mt-1 ${activeTab === 'home' ? 'text-blue-600 font-bold' : 'text-slate-400'}`}
        >
          Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onTabChange('medicines')}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <Pill size={23} color={activeTab === 'medicines' ? '#2563eb' : '#94a3b8'} />
        <Text
          className={`text-[11px] font-medium mt-1 ${activeTab === 'medicines' ? 'text-blue-600 font-bold' : 'text-slate-400'}`}
        >
          Medicines
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onTabChange('ask')}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <Mic size={23} color={activeTab === 'ask' ? '#7c3aed' : '#94a3b8'} />
        <Text
          className={`text-[11px] font-medium mt-1 ${activeTab === 'ask' ? 'text-purple-600 font-bold' : 'text-slate-400'}`}
        >
          Ask AI
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onTabChange('profile')}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <User size={23} color={activeTab === 'profile' ? '#2563eb' : '#94a3b8'} />
        <Text
          className={`text-[11px] font-medium mt-1 ${activeTab === 'profile' ? 'text-blue-600 font-bold' : 'text-slate-400'}`}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};
