import React, { ComponentType } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import { Icon } from './Icon'
import { color, radius, space } from '../theme/theme'

export interface DetailRowProps {
  icon?: ComponentType<any>
  label: string
  value: string
  actionIcon?: ComponentType<any>
  actionLabel?: string
  onActionPress?: () => void
  showDivider?: boolean
  style?: ViewStyle
}

export function DetailRow({
  icon,
  label,
  value,
  actionIcon,
  actionLabel,
  onActionPress,
  showDivider = false,
  style,
}: DetailRowProps) {
  return (
    <View style={[styles.container, showDivider && styles.divider, style]}>
      <View style={styles.leftColumn}>
        {icon ? (
          <View style={styles.iconBox}>
            <Icon icon={icon} size={15} color={color.ink3} />
          </View>
        ) : null}
        <Text style={styles.labelText}>{label}</Text>
      </View>

      <View style={styles.rightColumn}>
        <Text style={styles.valueText} numberOfLines={2}>
          {value}
        </Text>

        {onActionPress ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onActionPress}
            activeOpacity={0.6}
          >
            {actionIcon ? (
              <Icon icon={actionIcon} size={14} color={color.accent} />
            ) : null}
            {actionLabel ? (
              <Text style={styles.actionLabelText}>{actionLabel}</Text>
            ) : null}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.sm + 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: color.separator,
  },
  leftColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
    marginRight: space.sm,
  },
  iconBox: {
    marginRight: space.sm,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '400',
    color: color.ink3,
    lineHeight: 18,
  },
  rightColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.sm,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '500',
    color: color.ink,
    lineHeight: 20,
    textAlign: 'right',
    flexShrink: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    backgroundColor: color.surfaceSunken,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    minHeight: 36,
  },
  actionLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: color.accent,
  },
})
