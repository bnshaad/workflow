import React, { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../src/hooks/useAuth'
import { colors, typography } from '../src/theme'

export default function RootLayout() {
  const { user, profile, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!user || !profile) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login')
      }
    } else if (inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [user, profile, loading, segments])

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Workflow Field...</Text>
      </View>
    )
  }

  return (
    <View style={styles.flexOne}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="job/[id]" options={{ headerShown: false }} />
      </Stack>
    </View>
  )
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    fontWeight: typography.weights.medium,
  },
})
