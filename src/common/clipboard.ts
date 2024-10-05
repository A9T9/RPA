
function setStyle ($dom: HTMLElement, obj: Partial<CSSStyleDeclaration>) {
  Object.keys(obj).forEach((key: string) => {
    $dom.style[key as any] = obj[key as any] as any
  })
}

function createTextarea (): HTMLDivElement {
  // [legacy code] Used to use textarea for copy/paste
  //
  // const $input = document.createElement('textarea')
  // // Note: Firefox requires 'contenteditable' attribute, even on textarea element
  // // without it, execCommand('paste') won't work in Firefox
  // // reference: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard#Browser-specific_considerations_2
  // $input.setAttribute('contenteditable', true)
  // $input.id = 'clipboard_textarea'

  // Note: 2018-09-01, Firefox 61.0.2: Only able to paste clipboard into textarea for one time.
  // Switching to contenteditable div works fine
  const $input = document.createElement('div')
  $input.setAttribute('contenteditable', 'true')
  $input.id = 'clipboard_textarea'

  setStyle($input, {
    position: 'aboslute',
    top: '-9999px',
    left: '-9999px'
  })

  ;(document.body || document.documentElement).appendChild($input);
  return $input
}

function getTextArea (): HTMLDivElement {
  const $el = document.getElementById('clipboard_textarea')
  if ($el)  return $el as HTMLDivElement
  return createTextarea()
}

function withInput <T>(fn: (div: HTMLDivElement) => T): T | undefined {
  const $input = getTextArea()
  let ret: T | undefined

  try {
    ret = fn($input)
  } catch (e) {
    console.error(e)
  } finally {
    $input.innerHTML = ''
  }

  return ret
}

const api = {
  set: (text: string): void => {
    withInput($input => {
      $input.innerText = text
      $input.focus()
      document.execCommand('selectAll', false, null as any)
      document.execCommand('copy')
    })
  },
  get: (): string | undefined => {
    return withInput($input => {
      $input.blur()
      $input.focus()

      const res = document.execCommand('paste')

      if (res) {
        return $input.innerText
      }

      return 'no luck'
    })
  }
}

export default api
