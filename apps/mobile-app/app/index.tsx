import React, { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../src/hooks/useAuth'

export default function Index() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user || !profile) {
        router.replace('/(auth)/login')
      } else {
        router.replace('/(tabs)')
      }
    }
  }, [user, profile, loading, router])

  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#0284c7" />
      <Text style={styles.loadingText}>Redirecting...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
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
  },
})
