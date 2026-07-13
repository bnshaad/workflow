export type StructuredGenerationRequest = {
  prompt: string
  responseSchema: Record<string, unknown>
  systemInstruction: string
}

export interface StructuredModelProvider {
  generateJson(request: StructuredGenerationRequest): Promise<unknown>
}

export type ModelProviderFailureKind =
  | 'invalid_response'
  | 'missing_configuration'
  | 'quota_exhausted'
  | 'temporary_failure'
  | 'timeout'

export class ModelProviderError extends Error {
  constructor(
    readonly kind: ModelProviderFailureKind,
    message: string,
  ) {
    super(message)
    this.name = 'ModelProviderError'
  }
}

type FetchResponse = {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

type FetchImplementation = (
  input: string,
  init: {
    body: string
    headers: Record<string, string>
    method: 'POST'
    signal: AbortSignal
  },
) => Promise<FetchResponse>

const GEMINI_MODEL = 'gemini-2.5-flash-lite'
const MAX_ATTEMPTS = 2
const REQUEST_TIMEOUT_MS = 5_000

export function createGeminiModelProvider(
  apiKey: string | undefined,
  fetchImplementation: FetchImplementation = globalThis.fetch,
): StructuredModelProvider {
  if (!apiKey?.trim()) {
    return {
      async generateJson() {
        throw new ModelProviderError(
          'missing_configuration',
          'The Gemini API key is not configured.',
        )
      },
    }
  }

  return {
    async generateJson(request) {
      let lastError: ModelProviderError | null = null

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        try {
          return await generateGeminiJson(apiKey, request, fetchImplementation)
        } catch (error) {
          const normalizedError = normalizeProviderError(error)
          lastError = normalizedError

          if (
            normalizedError.kind !== 'temporary_failure' ||
            attempt === MAX_ATTEMPTS - 1
          ) {
            throw normalizedError
          }
        }
      }

      throw lastError ?? new ModelProviderError('temporary_failure', 'Model unavailable.')
    },
  }
}

async function generateGeminiJson(
  apiKey: string,
  request: StructuredGenerationRequest,
  fetchImplementation: FetchImplementation,
) {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  )

  try {
    const response = await fetchImplementation(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        body: JSON.stringify({
          contents: [{ parts: [{ text: request.prompt }] }],
          generationConfig: {
            candidateCount: 1,
            responseMimeType: 'application/json',
            responseSchema: request.responseSchema,
            temperature: 0,
          },
          systemInstruction: {
            parts: [{ text: request.systemInstruction }],
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        method: 'POST',
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      throw response.status === 429
        ? new ModelProviderError('quota_exhausted', 'Gemini quota exceeded.')
        : new ModelProviderError('temporary_failure', 'Gemini request failed.')
    }

    const body = await response.json()
    const text = readResponseText(body)

    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new ModelProviderError('invalid_response', 'Gemini returned invalid JSON.')
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ModelProviderError('timeout', 'Gemini request timed out.')
    }

    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}

function readResponseText(value: unknown) {
  const body = value as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>
  }
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text

  if (typeof text !== 'string' || text.length === 0) {
    throw new ModelProviderError('invalid_response', 'Gemini response is empty.')
  }

  return text
}

function normalizeProviderError(error: unknown) {
  if (error instanceof ModelProviderError) {
    return error
  }

  return new ModelProviderError('temporary_failure', 'Gemini request failed.')
}
