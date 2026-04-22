const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script'

let googleMapsScriptPromise: Promise<void> | null = null

function hasGoogleMapsLoaded() {
  return Boolean((window as Window & { google?: { maps?: unknown } }).google?.maps)
}

export function loadGoogleMapsScript(
  apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser.'))
  }

  if (!apiKey) {
    return Promise.reject(
      new Error('Google Maps API key is missing. Add VITE_GOOGLE_MAPS_API_KEY to .env.local.'),
    )
  }

  if (hasGoogleMapsLoaded()) {
    return Promise.resolve()
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise
  }

  googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null

    const handleLoad = () => {
      const script = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
      script?.setAttribute('data-loaded', 'true')
      resolve()
    }

    const handleError = () => {
      googleMapsScriptPromise = null
      reject(new Error('Failed to load Google Maps script.'))
    }

    if (existingScript) {
      if (existingScript.getAttribute('data-loaded') === 'true') {
        resolve()
        return
      }

      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&language=en&region=US`
    script.async = true
    script.defer = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  })

  return googleMapsScriptPromise
}
