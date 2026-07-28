import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../src/hooks/useAuth'

export default function RootLayout() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Loading Workflow Field...</Text>
      </View>
    )
  }

  return (
    <View style={styles.flexOne}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        {!user || !profile ? (
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="(tabs)/index" options={{ headerShown: false }} />
            <Stack.Screen name="job/[id]" options={{ headerShown: false }} />
          </>
        )}
      </Stack>
    </View>
  )
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
})
