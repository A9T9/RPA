
const setStyle = ($dom, obj) => {
  Object.keys(obj).forEach(key => {
    $dom.style[key] = obj[key]
  })
}

const withInput = (fn) => {
  const $input = document.createElement('textarea')
  // Note: Firefox requires 'contenteditable' attribute, even on textarea element
  // without it, execCommand('paste') won't work in Firefox
  // reference: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard#Browser-specific_considerations_2
  $input.setAttribute('contenteditable', true)

  setStyle($input, {
    position: 'aboslute',
    top: '-9999px',
    left: '-9999px'
  })

  document.body.appendChild($input)

  let ret

  try {
    ret = fn($input)
  } finally {
    document.body.removeChild($input)
  }

  return ret
}

const api = {
  set: (text) => {
    withInput($input => {
      $input.value = text
      $input.select()
      document.execCommand('copy')
    })
  },
  get: () => {
    return withInput($input => {
      $input.select()

      if (document.execCommand('Paste')) {
        return $input.value
      }

      return 'no luck'
    })
  }
}

export default api
