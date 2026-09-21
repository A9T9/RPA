// The absolute path of the last completed download, as the browser reported
// it (bg's downloads.onChanged → DOWNLOAD_COMPLETE → init_player). The
// variable pool only keeps the base name (!LAST_DOWNLOADED_FILE_NAME); with
// several browsers connected to the bridge the name alone does not say WHERE
// the file landed, so uiv.download logs this path (OPEN-ISSUES 23.5).
let lastPath = ''
// the name the SITE proposed before the rename, and how many earlier arms of
// this run had expired when the file was captured — the evidence for "this
// may be an earlier trigger's file arriving late" (OPEN-ISSUES 30.8)
let lastSiteName = ''
let lastOrphanWarning = 0
let lastDuplicateOf: { name: string; secondsAgo: number } | null = null

export const setLastDownloadPath = (p: string | null | undefined, siteName?: string, orphanWarning?: number, duplicateOf?: { name: string; secondsAgo: number } | null): void => {
  const next = p ? String(p) : ''
  // bg.js has an OLDER onChanged listener that also sends DOWNLOAD_COMPLETE
  // for every finished download, with the filename only — when that copy
  // arrives second it must not wipe the site name / orphan flag the
  // DownloadMan copy carried for the same file (30.8)
  const bare = siteName === undefined && orphanWarning === undefined
  if (bare && next === lastPath) return
  lastPath = next
  lastSiteName = siteName ? String(siteName) : ''
  lastOrphanWarning = Number(orphanWarning) || 0
  lastDuplicateOf = duplicateOf || null
}

export const getLastDownloadPath = (): string => lastPath
export const getLastDownloadInfo = (): { path: string; siteName: string; orphanWarning: number; duplicateOf: { name: string; secondsAgo: number } | null } => ({ path: lastPath, siteName: lastSiteName, orphanWarning: lastOrphanWarning, duplicateOf: lastDuplicateOf })
