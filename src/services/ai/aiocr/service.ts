// AI-provider OCR — the "aiprovider" engine (settings id 90, {engine:
// 'aiprovider'} in JS scripts): the configured AI provider reads the image
// like uiv.ai.ask would, but the answer comes back as word boxes in the
// OCR.Space response shape — so findText/findTexts/read and every other OCR
// consumer work unchanged, exactly the way OCR.Space plugs in. On the
// Ui.Vision proxy these calls carry the task header 'aiocr'.
//
// Reality check baked into the design: vision models produce useful WORDS
// reliably and useful BOXES approximately. That is the same trade-off
// ocrspace_engine3 makes (best text, coarser coordinates), and the prompt
// rule sends authors here only when the local engines and OCR.Space are not
// available or not good enough.

import { getAIProviderConfig } from '@/services/ai/computer_use/service'
import { askOpenAICompatible, scaleForVision } from '@/services/ai/vision_prompt/service'
import AnthropicService from '@/services/ai/anthropic/anthropic.service'
import { dataURItoBlob } from '@/common/utils'

export const AI_PROVIDER_OCR_ENGINE = 90

const ocrPrompt = (width: number, height: number, wantsNormalized: boolean) => {
  const space = wantsNormalized
    ? 'normalized to a 0-1000 scale where 0,0 is the top-left and 1000,1000 the bottom-right of the image'
    : `in image pixels (the image is ${width} x ${height} pixels, origin top-left)`
  return 'You are an OCR engine. Read ALL text visible in the provided image. ' +
    'Return ONLY strict JSON — no markdown fences, no commentary — in exactly this shape: ' +
    '{"lines":[{"words":[{"text":"word","x":0,"y":0,"w":0,"h":0}]}]} ' +
    `where x,y,w,h are each word's bounding box ${space}. ` +
    'Words on one visual text line share one "lines" entry, in left-to-right order; lines are ordered top to bottom. ' +
    'Every readable word appears exactly once. If the image contains no text, return {"lines":[]}.'
}

// A token-capped model stops mid-array; everything before the cut is good
// data. Trim back to the last complete object and close what stayed open —
// a partial read beats an error for every OCR consumer.
const repairTruncatedJson = (s: string): string | null => {
  const lastBrace = s.lastIndexOf('}')
  if (lastBrace < 0) return null
  const cut = s.slice(0, lastBrace + 1)
  const closers: string[] = []
  let inStr = false
  let esc = false
  for (const ch of cut) {
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') closers.push('}')
    else if (ch === '[') closers.push(']')
    else if (ch === '}' || ch === ']') closers.pop()
  }
  if (inStr || closers.length === 0) return null
  return cut + closers.reverse().join('')
}

// The model's JSON out of whatever it wrapped it in (fences, prose).
const parseLines = (text: string): Array<{ words: Array<{ text: string, x: number, y: number, w: number, h: number }> }> => {
  const cleaned = String(text).replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error(`aiprovider OCR: the model returned no JSON (got: ${cleaned.slice(0, 120)}…)`)
  let parsed: any
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1))
  } catch (e) {
    const repaired = repairTruncatedJson(cleaned.slice(start))
    try {
      if (repaired) parsed = JSON.parse(repaired)
    } catch (e2) { /* fall through to the original error */ }
    if (!parsed) throw new Error(`aiprovider OCR: the model's JSON did not parse (${(e as Error).message})`)
  }
  const lines = Array.isArray(parsed && parsed.lines) ? parsed.lines : []
  return lines
    .map((l: any) => ({
      words: (Array.isArray(l && l.words) ? l.words : [])
        .filter((w: any) => w && typeof w.text === 'string' && [w.x, w.y, w.w, w.h].every((n: any) => typeof n === 'number' && isFinite(n)))
    }))
    .filter((l: any) => l.words.length > 0)
}

/**
 * Run the configured AI provider as an OCR engine over a PNG data URL.
 * Resolves to an OCR.Space-shaped response with word boxes in the ORIGINAL
 * image's pixel space (the scale-to-ceiling factor is divided back out — the
 * exact omission that was the measured ai.ask coordinate bug).
 */
export async function runAiProviderOcr (imageDataUrl: string): Promise<any> {
  const buffer = await dataURItoBlob(imageDataUrl).arrayBuffer()
  const scaled = await scaleForVision(buffer)
  const providerConfig = getAIProviderConfig()

  let rawText: string
  let normalized: boolean
  if (providerConfig.provider === 'anthropic') {
    // own-key Anthropic keeps its own SDK path, like ai.ask; Anthropic
    // answers in the pixels of the image it was shown
    rawText = await new AnthropicService(providerConfig.apiKey)
      .promptWithImages(ocrPrompt(scaled.width, scaled.height, false), [scaled.buffer])
    normalized = false
  } else {
    // The model follows the PROMPT's coordinate wording, not its family's
    // native convention (field-verified 2026-08-25: pixel-worded OCR answers
    // came back in pixels while the response's coordSpace said normalized —
    // converting by coordSpace stretched every box ×1.46). So prompt and
    // conversion must be the same convention, chosen client-side: normalized
    // 0-1000, the space vision models ground best. coordSpace is ignored
    // here on purpose. 8192 tokens: a text-heavy 4K desktop truncates 4096.
    const answer = await askOpenAICompatible(ocrPrompt(scaled.width, scaled.height, true), [scaled.buffer], 'aiocr', { maxTokens: 8192 })
    rawText = answer.text
    normalized = true
  }

  const toImagePx = (w: { text: string, x: number, y: number, w: number, h: number }) => {
    const nx = normalized ? (w.x / 1000) * scaled.width : w.x
    const ny = normalized ? (w.y / 1000) * scaled.height : w.y
    const nw = normalized ? (w.w / 1000) * scaled.width : w.w
    const nh = normalized ? (w.h / 1000) * scaled.height : w.h
    return {
      WordText: w.text,
      Left: Math.round(nx / scaled.scaleFactor),
      Top: Math.round(ny / scaled.scaleFactor),
      Width: Math.max(1, Math.round(nw / scaled.scaleFactor)),
      Height: Math.max(1, Math.round(nh / scaled.scaleFactor))
    }
  }

  const parsedLines = parseLines(rawText)
  // Guard for models that ignore the normalized instruction and answer in
  // the sent image's pixels anyway: normalized values never exceed 1000, so
  // anything clearly past it means pixel answers — convert accordingly.
  if (normalized) {
    const maxCoord = Math.max(0, ...parsedLines.flatMap(l => l.words.flatMap(w => [w.x + w.w, w.y + w.h])))
    if (maxCoord > 1050) normalized = false
  }

  const lines = parsedLines.map(l => {
    const Words = l.words.map(toImagePx)
    return {
      LineText: l.words.map(w => w.text).join(' '),
      Words,
      MaxHeight: Math.max(1, ...Words.map(w => w.Height)),
      MinTop: Math.min(...Words.map(w => w.Top))
    }
  })

  // same shape runOCRLocalViaXModule2 builds — every consumer parses this
  return {
    ParsedResults: [{
      TextOverlay: { Lines: lines, HasOverlay: true, Message: 'aiprovider ocr' },
      TextOrientation: '0',
      FileParseExitCode: 1,
      ParsedText: lines.map(l => l.LineText).join('\n'),
      ErrorMessage: '',
      ErrorDetails: ''
    }],
    OCRExitCode: 1,
    IsErroredOnProcessing: false,
    ProcessingTimeInMilliseconds: '0'
  }
}
