const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Disable package exports resolution so Metro resolves react-native field in firebase/auth
config.resolver.unstable_enablePackageExports = false

module.exports = config
