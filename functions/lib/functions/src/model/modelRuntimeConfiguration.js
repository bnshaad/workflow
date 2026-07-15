export function shouldReadGeminiSecret(environment) {
    return (environment.FUNCTIONS_EMULATOR !== 'true' ||
        environment.WORKFLOW_USE_REAL_GEMINI === 'true');
}
//# sourceMappingURL=modelRuntimeConfiguration.js.map