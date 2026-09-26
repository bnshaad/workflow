import React from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import { color, radius, space } from '../theme/theme'

export interface SegmentItem<T extends string = string> {
  id: T
  label: string
  count?: number
}

export interface SegmentedControlProps<T extends string = string> {
  segments: SegmentItem<T>[]
  selectedId: T
  onSelect: (id: T) => void
  style?: ViewStyle
}

export function SegmentedControl<T extends string = string>({
  segments,
  selectedId,
  onSelect,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.track, style]}>
      {segments.map((segment) => {
        const isSelected = segment.id === selectedId
        return (
          <TouchableOpacity
            key={segment.id}
            style={[styles.segment, isSelected && styles.selectedSegment]}
            onPress={() => onSelect(segment.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                isSelected ? styles.selectedLabel : styles.unselectedLabel,
              ]}
              numberOfLines={1}
            >
              {segment.label}
            </Text>
            {typeof segment.count === 'number' ? (
              <Text
                style={[
                  styles.count,
                  isSelected ? styles.selectedCount : styles.unselectedCount,
                ]}
              >
                ({segment.count})
              </Text>
            ) : null}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    padding: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingVertical: 6,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    gap: 4,
  },
  selectedSegment: {
    backgroundColor: color.surface,
    borderWidth: 0.5,
    borderColor: color.border,
  },
  label: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  selectedLabel: {
    color: color.ink,
    fontWeight: '600',
  },
  unselectedLabel: {
    color: color.ink2,
    fontWeight: '500',
  },
  count: {
    fontSize: 12,
  },
  selectedCount: {
    color: color.ink,
    fontWeight: '600',
  },
  unselectedCount: {
    color: color.ink3,
    fontWeight: '400',
  },
})
