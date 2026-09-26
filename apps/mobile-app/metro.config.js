const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Disable package exports resolution so Metro resolves react-native field in firebase/auth
config.resolver.unstable_enablePackageExports = false
config.watchFolders = [path.resolve(__dirname, '../../shared')]

const defaultResolveRequest = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform)
    }
    return context.resolveRequest(context, moduleName, platform)
  } catch (error) {
    if (moduleName.endsWith('.js')) {
      const tsModuleName = moduleName.slice(0, -3) + '.ts'
      try {
        if (defaultResolveRequest) {
          return defaultResolveRequest(context, tsModuleName, platform)
        }
        return context.resolveRequest(context, tsModuleName, platform)
      } catch {}
    }
    throw error
  }
}

module.exports = config

