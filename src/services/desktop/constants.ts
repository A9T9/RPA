
export const MethodTypeInvocationNames: Array<string> = [
  'get_version',
  'get_desktop_dpi',
  'get_image_info',
  'capture_desktop',
  'search_image',
  'search_desktop',
  'get_max_file_range',
  'get_file_size',
  'read_file_range',
  // Desktop border indicator — on the CV connection ON PURPOSE: each
  // native-messaging port is its own host process, and the process owning
  // the border windows must be the one capturing (so it can hide the frame
  // during its own captures on pre-2004 Windows; DWM capture-exclusion
  // covers newer builds and sibling processes).
  'show_display_border',
  'hide_display_border',
  'show_match_marks',
  'show_input_cue',
  'show_search_area',
  // the host's own interactive area picker (2.1.27+) — same connection as
  // capture_desktop, whose `rect` crop consumes the answered rectangle
  'select_region'
]
