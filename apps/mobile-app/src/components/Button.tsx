import React, { ComponentType } from 'react'
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import { Icon } from './Icon'
import { color, radius, space } from '../theme/theme'

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  title?: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ComponentType<any>
  iconPosition?: 'left' | 'right'
  iconSize?: number
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  children?: React.ReactNode
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  iconSize,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  children,
}: ButtonProps) {
  const isInteractive = !disabled && !loading

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; iconColor: string } => {
    switch (variant) {
      case 'primary':
      case 'accent':
        return {
          container: {
            backgroundColor: color.accent,
            borderColor: color.accentPress,
            borderWidth: 1,
          },
          text: { color: color.surface },
          iconColor: color.surface,
        }
      case 'secondary':
        return {
          container: {
            backgroundColor: color.surfaceSunken,
            borderColor: color.border,
            borderWidth: 1,
          },
          text: { color: color.ink },
          iconColor: color.ink2,
        }
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: color.border,
            borderWidth: 1,
          },
          text: { color: color.ink },
          iconColor: color.ink,
        }
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
          },
          text: { color: color.ink2 },
          iconColor: color.ink2,
        }
      case 'danger':
        return {
          container: {
            backgroundColor: color.dangerWash,
            borderColor: color.dangerWash,
            borderWidth: 1,
          },
          text: { color: color.danger },
          iconColor: color.danger,
        }
    }
  }

  // Minimum hit target 44pt on mobile per Section 5
  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; defaultIconSize: number } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            minHeight: 44,
            paddingHorizontal: space.md,
            borderRadius: radius.control,
          },
          text: {
            fontSize: 13,
            fontWeight: '600',
            lineHeight: 18,
          },
          defaultIconSize: 15,
        }
      case 'lg':
        return {
          container: {
            minHeight: 52,
            paddingHorizontal: space.xl,
            borderRadius: radius.control,
          },
          text: {
            fontSize: 17,
            fontWeight: '600',
            lineHeight: 22,
          },
          defaultIconSize: 18,
        }
      case 'md':
      default:
        return {
          container: {
            minHeight: 48,
            paddingHorizontal: space.lg,
            borderRadius: radius.control,
          },
          text: {
            fontSize: 15,
            fontWeight: '600',
            lineHeight: 20,
          },
          defaultIconSize: 16,
        }
    }
  }

  const variantStyle = getVariantStyles()
  const sizeStyle = getSizeStyles()
  const resolvedIconSize = iconSize || sizeStyle.defaultIconSize

  return (
    <TouchableOpacity
      style={[
        styles.baseContainer,
        sizeStyle.container,
        variantStyle.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabledContainer,
        style,
      ]}
      onPress={onPress}
      disabled={!isInteractive}
      activeOpacity={0.6} // 100ms ease-out 0.6 per Section 6
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyle.text.color as string}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' ? (
            <View style={styles.leftIcon}>
              <Icon icon={icon} size={resolvedIconSize} color={variantStyle.iconColor} />
            </View>
          ) : null}

          {children ? (
            children
          ) : title ? (
            <Text
              style={[
                styles.baseText,
                sizeStyle.text,
                variantStyle.text,
                disabled && styles.disabledText,
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}

          {icon && iconPosition === 'right' ? (
            <View style={styles.rightIcon}>
              <Icon icon={icon} size={resolvedIconSize} color={variantStyle.iconColor} />
            </View>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  baseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  leftIcon: {
    marginRight: space.sm,
  },
  rightIcon: {
    marginLeft: space.sm,
  },
  disabledContainer: {
    opacity: 0.4,
  },
  disabledText: {
    opacity: 0.8,
  },
})
