export type StructuredGenerationRequest = {
  prompt: string
  responseSchema: Record<string, unknown>
  systemInstruction: string
}

export interface StructuredModelProvider {
  generateJson(request: StructuredGenerationRequest): Promise<unknown>
}

export type ModelProviderFailureKind =
  | 'authentication_failed'
  | 'invalid_response'
  | 'missing_configuration'
  | 'quota_exhausted'
  | 'temporary_failure'
  | 'timeout'

export type ModelProviderDiagnostics = {
  code: string
  finishReason?: string
  httpStatus?: number
  modelName?: string
  responseLength?: number
  validationFields?: string[]
}

export class ModelProviderError extends Error {
  constructor(
    readonly kind: ModelProviderFailureKind,
    message: string,
    readonly diagnostics: ModelProviderDiagnostics = {
      code: kind,
    },
  ) {
    super(message)
    this.name = 'ModelProviderError'
  }
}

type FetchResponse = {
  ok: boolean
  status: number
  text(): Promise<string>
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

export const GEMINI_MODEL = 'gemini-3.1-flash-lite'
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
          {
            code: 'missing_configuration',
            modelName: GEMINI_MODEL,
          },
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
        body: JSON.stringify(buildGeminiRequestBody(request)),
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        method: 'POST',
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      const responseLength = (await readBodySafely(response)).length
      throw httpFailure(response.status, responseLength)
    }

    const responseBody = await readBodySafely(response)
    let body: unknown

    try {
      body = JSON.parse(responseBody) as unknown
    } catch {
      throw new ModelProviderError(
        'invalid_response',
        'Gemini returned an invalid response body.',
        {
          code: 'invalid_response_body',
          modelName: GEMINI_MODEL,
          responseLength: responseBody.length,
        },
      )
    }

    const text = readResponseText(body, responseBody.length)

    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new ModelProviderError(
        'invalid_response',
        'Gemini returned invalid JSON.',
        {
          code: 'invalid_json',
          modelName: GEMINI_MODEL,
          responseLength: text.length,
        },
      )
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ModelProviderError(
        'timeout',
        'Gemini request timed out.',
        {
          code: 'timeout',
          modelName: GEMINI_MODEL,
        },
      )
    }

    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}

export function buildGeminiRequestBody(request: StructuredGenerationRequest) {
  return {
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
  }
}

function readResponseText(value: unknown, responseLength: number) {
  const body = value as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: unknown
          thought?: unknown
          thoughtSignature?: unknown
        }>
      }
      finishReason?: unknown
    }>
  }
  const candidate = body.candidates?.[0]

  if (!candidate) {
    throw new ModelProviderError(
      'invalid_response',
      'Gemini returned no candidate.',
      {
        code: 'missing_candidate',
        modelName: GEMINI_MODEL,
        responseLength,
      },
    )
  }

  const finishReason = candidate.finishReason
  if (
    typeof finishReason === 'string' &&
    finishReason.length > 0 &&
    finishReason !== 'STOP'
  ) {
    throw new ModelProviderError(
      'invalid_response',
      'Gemini did not complete the response.',
      {
        code: 'finish_reason',
        finishReason,
        modelName: GEMINI_MODEL,
        responseLength,
      },
    )
  }

  const text = (candidate.content?.parts ?? [])
    .filter((part) => part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text as string)
    .join('')

  if (text.length === 0) {
    throw new ModelProviderError(
      'invalid_response',
      'Gemini response is empty.',
      {
        code: 'missing_text',
        modelName: GEMINI_MODEL,
        responseLength,
      },
    )
  }

  return text
}

function httpFailure(status: number, responseLength: number) {
  const diagnostics = {
    code: status === 400 ? 'schema_or_request_rejected' : 'http_failure',
    httpStatus: status,
    modelName: GEMINI_MODEL,
    responseLength,
  }

  if (status === 400) {
    return new ModelProviderError(
      'invalid_response',
      'Gemini rejected the structured request.',
      diagnostics,
    )
  }

  if (status === 404) {
    return new ModelProviderError(
      'invalid_response',
      'The configured Gemini model was not found.',
      { ...diagnostics, code: 'model_not_found' },
    )
  }

  if (status === 401 || status === 403) {
    return new ModelProviderError(
      'authentication_failed',
      'Gemini authentication failed.',
      { ...diagnostics, code: 'authentication_failed' },
    )
  }

  if (status === 429) {
    return new ModelProviderError(
      'quota_exhausted',
      'Gemini quota exceeded.',
      { ...diagnostics, code: 'quota_exhausted' },
    )
  }

  return new ModelProviderError(
    'temporary_failure',
    'Gemini request failed.',
    diagnostics,
  )
}

async function readBodySafely(response: FetchResponse) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

function normalizeProviderError(error: unknown) {
  if (error instanceof ModelProviderError) {
    return error
  }

  return new ModelProviderError(
    'temporary_failure',
    'Gemini request failed.',
    {
      code: 'network_failure',
      modelName: GEMINI_MODEL,
    },
  )
}
