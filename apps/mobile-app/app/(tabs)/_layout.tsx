import React from 'react'
import { StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { Briefcase, CheckCircle, User } from 'lucide-react-native'
import { color } from '../../src/theme/theme'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.ink3,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color: iconColor, focused }) => (
            <Briefcase size={22} color={iconColor} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color: iconColor, focused }) => (
            <CheckCircle size={22} color={iconColor} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color: iconColor, focused }) => (
            <User size={22} color={iconColor} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.separator,
    height: 56,
    paddingBottom: 6,
    paddingTop: 6,
    elevation: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
})

