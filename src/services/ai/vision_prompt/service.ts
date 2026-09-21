import { reportUsage } from '@/services/usage'
import { captureExecutionCloudCall } from '@/common/execution_locality'
import { getAIProviderConfig } from '@/services/ai/computer_use/service'
import Ext from '@/common/web_extension'
import { getXModuleVersion } from '@/services/xmodules2/routing'
import { chatCompletionsUrl } from '@/common/uiv_link'
import { uivInstallHeader } from '@/services/ai/uivision_free_tier'
import { CoordSpace, coordSpaceForModel } from '@/services/ai/openai_compatible/sampling'
import { openrouterReasoningParam, isReasoningMandatoryError, markReasoningMandatory } from '@/services/ai/openai_compatible/reasoning'

// OpenAI-compatible vision calls for aiPrompt and aiScreenXY.
//
// Both commands used to construct AnthropicService directly, which pins them to
// api.anthropic.com and an Anthropic key — so the free Ui.Vision tier, a local
// model and OpenRouter all failed with "No Anthropic API key", even though the
// AI chat and aiComputerUse work on every one of them. That was a gap in the
// code, not a capability limit: answering a question about an image and
// pointing at something on screen work on any vision-capable model.
//
// This module is the other half. The Anthropic path stays exactly as it was
// (see AnthropicService) — it is what the demos were tuned against — and
// everything else comes through here.

type Coord = { x: number; y: number }

export type VisionResult = {
  coords: Coord[]
  isSinglePoint?: boolean
  aiResponse: string
}

// Same ceiling AnthropicService uses, for the same reason: a full-resolution
// screenshot is mostly wasted tokens, and every provider bills for them.
const MAX_PIXELS = 1191888

/**
 * Scale a PNG down to the pixel ceiling. Returns the bytes to send plus the
 * factor, because coordinates come back in the SCALED image's space and have to
 * be divided back out — get this wrong and every click lands proportionally
 * off, which looks like a bad model rather than bad arithmetic.
 */
export async function scaleForVision (
  imageBuffer: ArrayBuffer
): Promise<{ buffer: ArrayBuffer; scaleFactor: number; width: number; height: number }> {
  // lazy: jimp is ~700 KB and must stay out of the eager panel bundle
  const { Jimp } = await import('jimp')
  const image = await Jimp.read(imageBuffer as any)

  const width = image.bitmap.width
  const height = image.bitmap.height
  const totalPixels = width * height

  if (totalPixels <= MAX_PIXELS) {
    return { buffer: imageBuffer, scaleFactor: 1, width, height }
  }

  const scaleFactor = Math.sqrt(MAX_PIXELS / totalPixels)
  const scaledWidth = Math.round(width * scaleFactor)
  const scaledHeight = Math.round(height * scaleFactor)

  image.resize({ w: scaledWidth, h: scaledHeight })
  const buffer = await image.getBuffer('image/png')

  return { buffer: buffer as any, scaleFactor, width: scaledWidth, height: scaledHeight }
}

const toDataUrl = (buffer: ArrayBuffer): string =>
  `data:image/png;base64,${Buffer.from(buffer as any).toString('base64')}`

export type OpenAICompatAnswer = {
  text: string
  // coordinate convention for THIS answer, best source first: the
  // X-Coord-Space response header (the Ui.Vision proxy sends it, so rolled-out
  // extensions keep clicking correctly when the server swaps models), then the
  // model id the response reports, then the configured model. Same priority
  // chain the computer-use loop uses (see openai_compatible/sampling.ts).
  coordSpace: CoordSpace
  // per input image (null where the input was null/undefined): what was
  // actually SENT after scaleForVision. Coordinates in the answer live in this
  // space; callers that parse coordinates must divide scaleFactor back out.
  imageScales: Array<{ scaleFactor: number; width: number; height: number } | null>
}

/**
 * One round trip to whatever OpenAI-compatible endpoint is configured
 * (the Ui.Vision free tier, OpenRouter, a local server).
 */
export async function askOpenAICompatible (
  promptText: string,
  imageBuffers: Array<ArrayBuffer | null | undefined>,
  task: string = 'unknown',
  opts: { maxTokens?: number } = {}
): Promise<OpenAICompatAnswer> {
  const providerConfig = getAIProviderConfig()
  const recordCloudCall = captureExecutionCloudCall(providerConfig.provider)

  const content: any[] = [{ type: 'text', text: promptText }]
  const imageScales: OpenAICompatAnswer['imageScales'] = []
  for (const buffer of imageBuffers) {
    if (!buffer) {
      imageScales.push(null)
      continue
    }
    const scaled = await scaleForVision(buffer)
    imageScales.push({ scaleFactor: scaled.scaleFactor, width: scaled.width, height: scaled.height })
    content.push({ type: 'image_url', image_url: { url: toDataUrl(scaled.buffer) } })
  }

  const body: any = {
    model: providerConfig.model,
    // 1024 fits an answer; word-by-word outputs (aiocr) need real room —
    // a text-heavy screen truncates at 1024 and the JSON dies mid-array
    max_tokens: opts.maxTokens || 1024,
    messages: [{ role: 'user', content }]
  }
  // Reasoning models burn "thinking" tokens against max_tokens and then return
  // an EMPTY answer at 1024 (measured with qwen3.7-flash, 2026-08: every ai.find
  // reply came back blank). Same fix as the chat and computer-use loops:
  // OpenRouter's unified param, only sent there (local endpoints may not know
  // it, and the Ui.Vision proxy forces it server-side anyway).
  const onOpenRouter = /openrouter\.ai/i.test(providerConfig.baseURL)
  if (onOpenRouter) body.reasoning = openrouterReasoningParam(providerConfig.model)

  const doFetch = () => fetch(chatCompletionsUrl(providerConfig.baseURL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(providerConfig.apiKey ? { Authorization: `Bearer ${providerConfig.apiKey}` } : {}),
      // WHICH CALL this is, named as the JS API names it: ai.ask, ai.find,
      // ai.computerUse, aichat. The four want very different things — pointing
      // at a screen coordinate needs spatial grounding, answering a question
      // about an image does not — so a proxy can route each to a suitable
      // model instead of paying for the strongest on every call.
      // A plain header: OpenAI-compatible servers that do not care ignore it,
      // and it stays out of the request body schema. It is a HINT, not a
      // trust boundary — the client sets it, so route COST on it, not access.
      'X-UIV-Task': task,
      // build cohort marker — lets the proxy split metrics by client version
      // (retention.md 9.4); a HINT like the task header, never an access key
      'X-UIV-Version': Ext.runtime.getManifest().version,
      'X-UIV-XModule-Version': getXModuleVersion(),
      'X-Title': 'Ui.Vision RPA',
      // device id — our proxy only; on PRO the Bearer header is the account key
      ...uivInstallHeader(providerConfig.baseURL)
    },
    body: JSON.stringify(body)
  })

  recordCloudCall()
  let res = await doFetch()

  // Models that refuse reasoning-off (HTTP 400 "Reasoning is mandatory",
  // e.g. gemini-3.7-flash): remember the model, retry once with the closest
  // legal request, {effort:'low'}.
  if (!res.ok && onOpenRouter) {
    const detail = await res.text().catch(() => '')
    if (!isReasoningMandatoryError(res.status, detail)) {
      throw new Error(`E353: ${providerConfig.label} API returned HTTP ${res.status}. ${detail.slice(0, 300)}`)
    }
    markReasoningMandatory(providerConfig.model)
    body.reasoning = openrouterReasoningParam(providerConfig.model)
    res = await doFetch()
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`E353: ${providerConfig.label} API returned HTTP ${res.status}. ${detail.slice(0, 300)}`)
  }

  const headerSpace = res.headers.get('x-coord-space')
  const json: any = await res.json()
  const text = json && json.choices && json.choices[0] && json.choices[0].message
    ? json.choices[0].message.content
    : ''

  if (typeof text !== 'string' || !text.length) {
    throw new Error(`E353: ${providerConfig.label} returned no answer.`)
  }

  const coordSpace: CoordSpace =
    headerSpace === 'normalized-1000' || headerSpace === 'absolute'
      ? headerSpace
      : coordSpaceForModel(typeof json.model === 'string' && json.model ? json.model : providerConfig.model)

  reportUsage('ai', providerConfig.provider === 'uivision' ? (providerConfig.tier === 'pro' ? 'pro' : 'free') : providerConfig.provider === 'local' ? 'local' : 'own-key')
  window.dispatchEvent(new Event('uiv-allowance-changed'))
  return { text, coordSpace, imageScales }
}

/**
 * Coordinates out of a reply. The prompt asks for "x,y|||", but models
 * embellish — "(412, 660)", "x=412 y=660", a sentence around it — so this takes
 * the first plausible pair rather than insisting on the exact format. Returning
 * nothing is better than returning a number scraped out of prose, so a match
 * needs two integers close together.
 */
export function parseCoordsFromText (text: string): Coord[] {
  const cleaned = String(text).replace(/\|\|\|/g, ' ')

  const patterns = [
    /x\s*[=:]\s*(\d+)\s*[, ]\s*y\s*[=:]\s*(\d+)/i,
    /\(\s*(\d+)\s*,\s*(\d+)\s*\)/,
    /\b(\d{1,5})\s*,\s*(\d{1,5})\b/
  ]

  for (const re of patterns) {
    const m = re.exec(cleaned)
    if (m) return [{ x: parseInt(m[1], 10), y: parseInt(m[2], 10) }]
  }
  return []
}

/** aiPrompt for every non-Anthropic provider: text (+images) in, text out. */
export async function visionPrompt (
  mainImageBuffer: ArrayBuffer | null,
  searchImageBuffer: ArrayBuffer | null,
  promptText: string
): Promise<VisionResult> {
  const answer = await askOpenAICompatible(promptText, [mainImageBuffer, searchImageBuffer], 'ai.ask')
  const rawCoords = parseCoordsFromText(answer.text)

  // Any coordinates in the answer name a spot on the MAIN image, which
  // askOpenAICompatible may have downscaled to the pixel ceiling — so the same
  // two conversions as visionLocate: model convention into sent-image pixels,
  // then the scale factor back out. Skipping the second step was the measured
  // ai.ask bug: every coordinate came back multiplied by ~0.76 on a 4K screen.
  const main = answer.imageScales[0]
  const coords = main
    ? (answer.coordSpace === 'normalized-1000'
        ? rawCoords.map(c => ({ x: (c.x / 1000) * main.width, y: (c.y / 1000) * main.height }))
        : rawCoords
      ).map(c => ({ x: Math.round(c.x / main.scaleFactor), y: Math.round(c.y / main.scaleFactor) }))
    : rawCoords

  return { coords, isSinglePoint: true, aiResponse: answer.text }
}

/**
 * aiScreenXY for every non-Anthropic provider: where is this thing on screen?
 *
 * The prompt states the image's dimensions and demands bare coordinates — the
 * same shape the Anthropic path asks for, so the two behave alike. Coordinates
 * are divided back out of the scale factor before they are returned, so the
 * caller always gets ORIGINAL-image pixels regardless of what was sent.
 */
export async function visionLocate (
  imageBuffer: ArrayBuffer,
  promptText: string
): Promise<VisionResult> {
  const scaled = await scaleForVision(imageBuffer)

  // Prompt wording follows the CONFIGURED model's convention (the free tier
  // hides the real model until the response arrives — a Qwen that gets the
  // pixel wording still answers normalized, which the scaling below corrects).
  const wantsNormalized = coordSpaceForModel(getAIProviderConfig().model) === 'normalized-1000'
  const coordFormat = wantsNormalized
    ? 'Reply with ONLY the x,y coordinates of that element normalized to a 0-1000 scale, where 0,0 is the top-left and 1000,1000 the bottom-right of the image, in the format x,y — no words, no units, no explanation.'
    : 'Reply with ONLY the x,y pixel coordinates of that element in the image, in the format x,y — no words, no units, no explanation.'
  const prompt = `${promptText}. Analyze the provided image (${scaled.width} x ${scaled.height} pixels). ${coordFormat}`

  // aiScreenXY is the one that needs real spatial grounding — the task most
  // worth routing to a stronger model
  const answer = await askOpenAICompatible(prompt, [scaled.buffer], 'ai.find')
  const rawCoords = parseCoordsFromText(answer.text)

  if (!rawCoords.length) {
    return { coords: [{ x: 0, y: 0 }], isSinglePoint: false, aiResponse: answer.text }
  }

  // Two conversions, in order: (1) the model's coordinate convention into
  // pixels of the SENT (possibly downscaled) image — Qwen3-VL and Gemini
  // answer 0-1000 normalized regardless of what the prompt asked for
  // (measured 2026-08-04: raw qwen3.7-plus replies were exactly pos/size*1000,
  // 0/14 target hits read as pixels, 12/13 rescaled) — then (2) the sent
  // image's scale factor back out, so the caller gets ORIGINAL-image pixels.
  const scaledCoords = answer.coordSpace === 'normalized-1000'
    ? rawCoords.map(c => ({ x: (c.x / 1000) * scaled.width, y: (c.y / 1000) * scaled.height }))
    : rawCoords

  const coords = scaledCoords.map(c => ({
    x: Math.round(c.x / scaled.scaleFactor),
    y: Math.round(c.y / scaled.scaleFactor)
  }))

  return { coords, isSinglePoint: true, aiResponse: answer.text }
}
