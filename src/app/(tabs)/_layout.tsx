import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Peta LBS',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'map' : 'map-outline'}
              size={22}
              color={typeof color === 'string' ? color : '#64748B'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="panic"
        options={{
          title: 'PANIK DARURAT',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'alert-circle' : 'alert-circle-outline'}
              size={26}
              color={focused ? '#DC2626' : '#EF4444'}
            />
          ),
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: 'bold',
            color: '#DC2626',
          },
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Faskes & IGD',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'business' : 'business-outline'}
              size={22}
              color={typeof color === 'string' ? color : '#64748B'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault Medis',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={22}
              color={typeof color === 'string' ? color : '#64748B'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
