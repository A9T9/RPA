import { searchImageInExtension as searchV2, SearchImageInExtensionRequest } from './adaptor'
import { ConvertResultItem } from '../desktop'
import { greenPinkUnsupportedError } from '../xmodules2/routing'

// In-extension (browser-scope) image search — the Rust vision-core WASM
// engine is the only engine since 10.0.151 (the classic kantusearch worker
// was removed with the rest of the old-XModules generation). Green/pink
// macros HARD-FAIL: they were never migrated by design (anchor+offset
// replaces them); the error explains the migration and the V9 downgrade.

export function searchImageInExtensionRouted (req: SearchImageInExtensionRequest): Promise<ConvertResultItem[]> {
  if (req.enableGreenPinkBoxes || req.requireGreenPinkBoxes) {
    return Promise.reject(greenPinkUnsupportedError((req as any).fileName))
  }
  return searchV2(req)
}
