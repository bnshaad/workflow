import React, { ComponentType } from 'react'
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { Icon } from './Icon'
import { Button, ButtonVariant } from './Button'
import { color, radius, space, type } from '../theme/theme'

export interface ConfirmModalProps {
  visible: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: ButtonVariant
  icon?: ComponentType<any>
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  icon,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {icon ? (
                <View style={styles.iconCircle}>
                  <Icon icon={icon} size={22} color={color.ink} />
                </View>
              ) : null}

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>

                <Button
                  title={confirmText}
                  variant={confirmVariant}
                  size="md"
                  loading={loading}
                  onPress={onConfirm}
                  style={styles.confirmButton}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: color.surface,
    borderRadius: radius.card,
    padding: space.xl,
    borderWidth: 1,
    borderColor: color.border,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    backgroundColor: color.surfaceSunken,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: color.ink,
    letterSpacing: -0.2,
    marginBottom: space.xs,
  },
  message: {
    ...type.body,
    color: color.ink2,
    lineHeight: 21,
    marginBottom: space.xl,
  },
  actionRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.control,
    backgroundColor: color.surfaceSunken,
    borderWidth: 1,
    borderColor: color.border,
  },
  cancelButtonText: {
    ...type.body,
    fontWeight: '600',
    color: color.ink,
  },
  confirmButton: {
    flex: 1,
  },
})
