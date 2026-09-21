import { usageStatisticsDefault } from '@/services/usage/preferences'
import { store } from '@/redux'
import storage from '@/common/storage'
import { getXModuleVersion } from '@/services/xmodules2/routing'
import { OPENAI_COMPAT } from '@/common/constant'

// Ui.Vision AI tier (provider id 'uivision'): pseudonymous install ID, the PRO
// key, and friendly messages for the proxy's error codes. Server side lives in
// the uivision-ai-proxy repo (see its HANDOVER-extension-work.md for the free
// tier and HANDOVER-pro-tier-extension.md for PRO).
//
// Both tiers are the SAME provider id and the same endpoint. What differs is
// one header: free sends the install ID as the Bearer token, PRO sends the
// purchased key and moves the install ID to X-UIV-Install.

// chrome.storage.local on purpose (NOT storage.sync): the free-tier quota is
// per-machine, so every machine must have its own ID.
export { getInstallId, getInstallIdSync } from './install_id'
import { getInstallIdSync } from './install_id'

// A PRO key is the ACCOUNT and now occupies the Bearer header, so the install
// ID — which identifies the DEVICE — moves to its own header. Sent on both
// tiers (on free the server ignores it, it equals the bearer token), but ONLY
// to our own proxy: a stable pseudonymous id has no business being handed to
// OpenRouter or to whatever is listening on a local endpoint.
// X-UIV-Version rides along under the same gate: it gives the proxy monitor a
// per-extension-version split (HANDOVER-server-prompt-extension.md), and the
// version is no secret to our own server while still not being broadcast to
// third-party endpoints.
export const uivInstallHeader = (baseURL: string): Record<string, string> => {
  if (baseURL !== OPENAI_COMPAT.UIVISION_BASE_URL) return {}
  const config = store.getState().config
  const headers: Record<string, string> = { 'X-UIV-Install': getInstallIdSync(),
    'X-UIV-Engine': config.uivisionEngine === 'advanced' ? 'advanced' : 'standard',
    'X-UIV-Usage': usageStatisticsDefault(config) ? 'on' : 'off' }
  try {
    headers['X-UIV-Version'] = chrome.runtime.getManifest().version
    headers['X-UIV-XModule-Version'] = getXModuleVersion()
  } catch (e) {
    // not in an extension context (tests) — the header is optional anyway
  }
  return headers
}

// ---------- PRO tier ----------
// config.uivisionTier records which of the two Ui.Vision entries in the
// provider dropdown was picked. It is a separate field rather than a second
// provider id on purpose: ~15 places branch on provider === 'uivision' (the
// consent gate, the base URL, hiding the model picker), and every one of them
// is still correct for PRO.
export const PRO_KEY_CONFIG_NAME = 'uivisionProKey'

// LENGTH ONLY, deliberately — not the prefix, not the charset. This check
// exists to catch a half-copied paste before it costs a round trip, and length
// is the part of the shape that cannot go stale: the server's accepted formats
// are a settings LIST that can grow (a second product line with its own
// prefix, a checksum), and a client that insisted on today's prefix would
// reject tomorrow's valid key until every user updated the extension.
// Validating the key is the server's job — it answers E701.
const PRO_KEY_LENGTH = 15

export const isProKeyFormat = (key: string): boolean => String(key || '').trim().length === PRO_KEY_LENGTH

// Deliberately says nothing about prefix or length: spelling out the shape
// hands an attacker the key format, and a user with a real key does not need
// it — they just pasted the wrong string.
export const PRO_KEY_FORMAT_ERROR = 'This key did not pass the local format check. Please check it and paste it again.'

export const isProTier = (config: { [key: string]: any }): boolean =>
  (config.aiProvider || 'uivision') === 'uivision' && config.uivisionTier === 'pro'

// Trimmed because a key pasted out of an order email arrives with a trailing
// newline often enough that not trimming is a support ticket.
// "ui-vision-ai-free" is the placeholder shipped in the shared keys.json
// (OPEN-ISSUES 38): it means the free tier, exactly like an empty key.
export const getProKey = (config: { [key: string]: any }): string => {
  const k = String(config[PRO_KEY_CONFIG_NAME] || '').trim()
  return k.toLowerCase() === 'ui-vision-ai-free' ? '' : k
}

// True when PRO is selected but no key has been entered yet — the requests
// still go out on free quota, which the settings tab says next to the field.
export const isProTierWithoutKey = (config: { [key: string]: any }): boolean =>
  isProTier(config) && !getProKey(config)

// True until the user explicitly picked an AI setup (free tier opt-in in the
// AI chat, or a provider chosen in Settings > AI — both save config.aiProvider).
// While pending, nothing may be sent to the free-tier server: the effective
// default is 'uivision', and using it means chat content (incl. screenshots)
// flows through the a9t9 server — that needs the user's one-time consent.
export const isFreeTierConsentPending = (config: { [key: string]: any }): boolean => !config.aiProvider

// The thrown message is `HTTP <status>: <json body>` — the server's own
// wording for a code, when it carries the fact the user needs (WHICH key
// replaced theirs, WHICH limit they hit) and we would only paraphrase it worse.
const serverText = (message: string): string | null => {
  const at = message.indexOf('{')
  if (at < 0) return null
  try {
    const body = JSON.parse(message.slice(at))
    const text = [body?.error, body?.details].filter(Boolean).join(' ').trim()
    return text || null
  } catch (e) {
    // bodies are truncated to 300 chars at the throw site, so half a JSON
    // object is a normal outcome here, not an error worth reporting
    return null
  }
}

// Friendly texts for the proxy error codes users should understand (E703
// daily limit, E704/E705 tier unavailable, E706/E710 busy, E711 key revoked).
// Returns null for everything else so those keep the generic error path.
//
// `isPro` matters for E703: the free tier's "add your own API key" advice is an
// insult to someone who just paid, and the server already words it correctly
// per tier.
export const mapUIVisionFreeTierError = (message: string, isPro = false): string | null => {
  if (!message) return null
  // PRO only, and the one error where the server text must win: it says
  // whether the key was REPLACED (enter the new one) or revoked outright.
  if (message.includes('E711')) {
    return (
      serverText(message) ||
      'This Ui.Vision PRO key is no longer valid. Enter your current key in Settings > AI, or contact support.'
    )
  }
  if (message.includes('E703')) {
    if (isPro) {
      return serverText(message) || 'Daily Ui.Vision AI PRO limit reached. It resets at midnight (server time).'
    }
    return 'Daily free AI limit reached. It resets at midnight. Add your own API key in Settings > AI for unlimited use or sign-up for the Ui.Vision AI PRO plan.'
  }
  if (message.includes('E704') || message.includes('E705')) {
    return 'The free AI tier is currently unavailable (beta, no uptime guarantee). Add your own API key in Settings > AI for reliable service.'
  }
  if (message.includes('E706') || message.includes('E710')) {
    return 'The free AI service is busy. Please try again in a moment.'
  }
  return null
}
