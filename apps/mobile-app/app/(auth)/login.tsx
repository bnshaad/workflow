import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { AlertCircle, Briefcase } from 'lucide-react-native'
import { Button, Icon } from '../../src/components'
import { useAuth } from '../../src/hooks/useAuth'
import { color, radius, space, type } from '../../src/theme/theme'

export default function LoginScreen() {
  const [email, setEmail] = useState('employee@workflow.local')
  const [password, setPassword] = useState('123456')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both email and password.')
      return
    }

    setSubmitting(true)
    setLocalError(null)

    try {
      await login(email.trim(), password)
      router.replace('/(tabs)')
    } catch (err: any) {
      setLocalError(err.message || 'Login failed. Please check credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.contentBox}>
        {/* Minimalist Logo Box */}
        <View style={styles.logoBadge}>
          <Icon icon={Briefcase} size={24} color={color.accent} />
        </View>

        <Text style={styles.brandTitle}>Workflow Field</Text>

        <View style={styles.card}>
          {localError ? (
            <View style={styles.errorBanner}>
              <Icon icon={AlertCircle} size={15} color={color.danger} style={styles.errorIcon} />
              <Text style={styles.errorText}>{localError}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="employee@workflow.local"
            placeholderTextColor={color.ink3}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={color.ink3}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button
            title="Sign in"
            variant="accent"
            size="lg"
            fullWidth
            loading={submitting}
            onPress={handleLogin}
            style={styles.signInButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.surfaceSunken,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  contentBox: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.card,
    backgroundColor: color.accentWash,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space.md,
  },
  brandTitle: {
    ...type.screenTitle,
    color: color.ink,
    letterSpacing: -0.4,
    marginBottom: space.xl,
  },
  card: {
    width: '100%',
    backgroundColor: color.surface,
    borderRadius: radius.card,
    padding: space.xl,
    borderWidth: 1,
    borderColor: color.border,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.dangerWash,
    borderColor: color.danger,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: space.md,
    marginBottom: space.lg,
  },
  errorIcon: {
    marginRight: space.sm,
  },
  errorText: {
    color: color.danger,
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  label: {
    ...type.label,
    color: color.ink2,
    marginBottom: space.xs,
  },
  input: {
    backgroundColor: color.surfaceSunken,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: 15,
    color: color.ink,
    marginBottom: space.lg,
  },
  signInButton: {
    marginTop: space.xs,
  },
})
