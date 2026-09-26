declare module 'react-native' {
  export const View: any
  export const Text: any
  export const TextInput: any
  export const TouchableOpacity: any
  export const TouchableWithoutFeedback: any
  export const ActivityIndicator: any
  export const FlatList: any
  export const ScrollView: any
  export const RefreshControl: any
  export const KeyboardAvoidingView: any
  export const Platform: any
  export const StyleSheet: any
  export const Modal: any
  export const Animated: any
  export const Linking: any
  export const AppState: any
  export type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension'

  export type StyleProp<T = any> = any
  export type ViewStyle = any
  export type TextStyle = any
  export type ImageStyle = any
}

declare module 'expo-router' {
  export const Stack: any
  export const Tabs: any
  export const useRouter: () => {
    push: (href: string) => void
    replace: (href: string) => void
    back: () => void
  }
  export const useLocalSearchParams: <T>() => T
  export const useSegments: () => string[]
  export const usePathname: () => string
  export const Redirect: any
}

declare module 'expo-status-bar' {
  export const StatusBar: any
}
