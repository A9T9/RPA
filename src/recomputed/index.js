
export function hasUnsavedMacro (state) {
  const { editor } = state
  const { editing, editingSource, activeTab } = editor

  if (!editing.meta.src)  return true

  switch (activeTab) {
    case 'table_view': {
      const { hasUnsaved } = editing.meta || {}
      return hasUnsaved
    }

    case 'source_view': {
      return editingSource.original !== editingSource.current
    }

    default:
      throw new Error('Unknown activeTab')
  }
}

export function editorSelectedCommand (state) {
  const { meta, commands } = state.editor.editing

  if (!meta || meta.selectedIndex === -1) return null
  return commands[meta.selectedIndex] || null
}
