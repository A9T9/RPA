// OpenRouter's unified `reasoning` request parameter, shared by the three
// OpenRouter call paths (chat agent, computer use, vision prompt).
//
// We ask for reasoning OFF: thinking tokens bill as output, eat the
// max_tokens budget of long tool calls, and measurably hurt rule-following
// (see openai_compatible/sampling.ts). Some models REQUIRE reasoning and
// reject that with HTTP 400 "Reasoning is mandatory for this endpoint and
// cannot be disabled" (first seen with google/gemini-3.7-flash, 2026-08-25).
// For those the closest legal request is {effort: 'low'} — measured on
// gemini-3.7-flash: 0 reasoning tokens on a trivial ask, vs 63 with the
// parameter omitted entirely. The refusal is remembered per model for the
// service worker's lifetime, so a model costs at most one failed request
// per worker start.

const mandatoryReasoningModels = new Set<string>()

export const openrouterReasoningParam = (model: string): { enabled: false } | { effort: 'low' } =>
  mandatoryReasoningModels.has(model) ? { effort: 'low' } : { enabled: false }

export const isReasoningMandatoryError = (status: number, bodyText: string): boolean =>
  status === 400 && /reasoning/i.test(bodyText) && /mandatory|cannot be disabled/i.test(bodyText)

export const markReasoningMandatory = (model: string): void => {
  mandatoryReasoningModels.add(model)
}
