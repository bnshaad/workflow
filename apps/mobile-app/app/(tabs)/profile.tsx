import React, { useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Building2, LogOut, Mail } from 'lucide-react-native'
import { ConfirmModal, DetailRow } from '../../src/components'
import { useAuth } from '../../src/hooks/useAuth'
import { color, radius, space, type } from '../../src/theme/theme'

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user, profile, logout } = useAuth()
  const router = useRouter()

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleConfirmSignOut = async () => {
    setSigningOut(true)
    try {
      await logout()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setSigningOut(false)
      setShowSignOutConfirm(false)
      router.replace('/(auth)/login')
    }
  }

  const initials = (profile?.displayName || profile?.name || 'T')
    .slice(0, 2)
    .toUpperCase()

  return (
    <View style={[styles.rootView, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle}>Profile</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.userName}>
              {profile?.displayName || profile?.name || 'Field Technician'}
            </Text>
            <Text style={styles.roleText}>Field technician</Text>
          </View>
        </View>

        {/* Account Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Account</Text>

          <DetailRow
            icon={Mail}
            label="Email"
            value={profile?.email || user?.email || 'Not provided'}
            showDivider
          />

          <DetailRow
            icon={Building2}
            label="Organization"
            value={profile?.organizationId || 'Default organization'}
          />
        </View>

        {/* Certified Skills Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Skills</Text>

          {profile?.skills && profile.skills.length > 0 ? (
            <View style={styles.skillsBox}>
              {profile.skills.map((skill: string, index: number) => (
                <View key={index} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skill}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noSkillsText}>No skills listed.</Text>
          )}
        </View>

        {/* Sign Out Action Row at bottom of grouped list */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.signOutRow}
            onPress={() => setShowSignOutConfirm(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={showSignOutConfirm}
        title="Sign out"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign out"
        cancelText="Cancel"
        confirmVariant="primary"
        icon={LogOut}
        loading={signingOut}
        onConfirm={handleConfirmSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
    backgroundColor: color.surfaceSunken,
  },
  headerBar: {
    backgroundColor: color.surfaceSunken,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  screenTitle: {
    ...type.screenTitle,
    color: color.ink,
    letterSpacing: -0.4,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: space.lg,
    paddingBottom: space.xxxl,
    gap: space.md,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.border,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: radius.control,
    backgroundColor: color.accentWash,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.md,
  },
  avatarText: {
    color: color.accent,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  identityInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: color.ink,
    letterSpacing: -0.2,
  },
  roleText: {
    ...type.meta,
    color: color.ink3,
    marginTop: 2,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.border,
  },
  sectionHeader: {
    ...type.label,
    color: color.ink3,
    marginBottom: space.sm,
  },
  skillsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  skillChip: {
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  skillChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: color.ink2,
  },
  noSkillsText: {
    ...type.meta,
    color: color.ink3,
  },
  signOutRow: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: color.danger,
  },
})
