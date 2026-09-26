import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { AlertCircle, X } from 'lucide-react-native'
import { Icon } from './Icon'
import { Button } from './Button'
import { colors, radius, shadows, spacing, typography } from '../theme'
import type { IncidentCategory } from '../domain'
import { INCIDENT_CATEGORY_LABELS } from '../domain'

export interface ReportBlockerModalProps {
  visible: boolean
  loading?: boolean
  onClose: () => void
  onSubmit: (category: IncidentCategory, description: string) => Promise<void>
}

const CATEGORIES: IncidentCategory[] = [
  'customer_unavailable',
  'access_denied',
  'missing_parts',
  'safety_hazard',
  'scope_mismatch',
  'other',
]

export function ReportBlockerModal({
  visible,
  loading = false,
  onClose,
  onSubmit,
}: ReportBlockerModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory>('customer_unavailable')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!description.trim()) {
      setValidationError('Please enter a brief description of the issue.')
      return
    }

    setValidationError(null)
    try {
      await onSubmit(selectedCategory, description.trim())
      setDescription('')
      onClose()
    } catch {
      // Error handled by parent
    }
  }

  const handleModalClose = () => {
    if (loading) return
    setValidationError(null)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleModalClose}
    >
      <TouchableWithoutFeedback onPress={handleModalClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.cardContainer}
            >
              <View style={styles.card}>
                {/* Header */}
                <View style={styles.headerRow}>
                  <View style={styles.headerTitleBox}>
                    <View style={styles.iconCircle}>
                      <Icon icon={AlertCircle} size={18} color={colors.text.primary} />
                    </View>
                    <Text style={styles.title}>Report Blocker</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={handleModalClose}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Icon icon={X} size={18} color={colors.text.muted} />
                  </TouchableOpacity>
                </View>

                {validationError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{validationError}</Text>
                  </View>
                ) : null}

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Category Selection */}
                  <Text style={styles.label}>Category</Text>
                  <View style={styles.categoryGrid}>
                    {CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryPill,
                            isSelected && styles.categoryPillActive,
                          ]}
                          onPress={() => setSelectedCategory(cat)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.categoryText,
                              isSelected && styles.categoryTextActive,
                            ]}
                          >
                            {INCIDENT_CATEGORY_LABELS[cat]}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {/* Description Input */}
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Describe the issue..."
                    placeholderTextColor={colors.text.subtle}
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                    textAlignVertical="top"
                  />
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <Button
                    title="Cancel"
                    variant="secondary"
                    size="md"
                    disabled={loading}
                    onPress={handleModalClose}
                    style={styles.actionBtn}
                  />

                  <Button
                    title="Submit"
                    variant="primary"
                    size="md"
                    loading={loading}
                    onPress={handleSubmit}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%',
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  errorBox: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  categoryPill: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  categoryTextActive: {
    color: colors.primaryContrast,
    fontWeight: typography.weights.semibold,
  },
  textInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    height: 90,
    marginBottom: spacing.xl,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
})
