declare module 'react-native' {
  export const View: any
  export const Text: any
  export const TextInput: any
  export const TouchableOpacity: any
  export const ActivityIndicator: any
  export const FlatList: any
  export const ScrollView: any
  export const RefreshControl: any
  export const KeyboardAvoidingView: any
  export const Platform: any
  export const StyleSheet: any
}

declare module 'expo-router' {
  export const Stack: any
  export const useRouter: () => {
    push: (href: string) => void
    replace: (href: string) => void
    back: () => void
  }
  export const useLocalSearchParams: <T>() => T
}

declare module 'expo-status-bar' {
  export const StatusBar: any
}
