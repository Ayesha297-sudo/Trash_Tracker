import React from 'react';
import { Tabs } from 'expo-router';

// --- Custom Components & Hooks ---
import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';

// --- Icons & Styling ---
import { Ionicons, FontAwesome5 } from '@expo/vector-icons'; 
import { Colors } from '@/constants/theme';

/**
 * TabLayout
 * Defines the bottom navigation bar for the application using Expo Router.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      
      {/* 🏠 Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="home" color={color} />
          ),
        }}
      />
      
      {/* 🗺️ Map Tab */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => (
            <FontAwesome5 size={24} name="map-marked-alt" color={color} />
          ), 
        }}
      />

      {/* 📸 Upload Proof Tab */}
      <Tabs.Screen
        name="upload-proof"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="camera" color={color} />
          ),
        }}
      />
      
    </Tabs>
  );
}