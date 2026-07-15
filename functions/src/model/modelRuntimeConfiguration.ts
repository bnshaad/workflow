export function shouldReadGeminiSecret(environment: NodeJS.ProcessEnv) {
  return (
    environment.FUNCTIONS_EMULATOR !== 'true' ||
    environment.WORKFLOW_USE_REAL_GEMINI === 'true'
  )
}
