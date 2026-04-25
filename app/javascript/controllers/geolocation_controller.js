import { Controller } from "@hotwired/stimulus"

// Wraps `navigator.geolocation.getCurrentPosition` for forms that need
// the user's coordinates. Two modes, picked by which targets exist:
//
// 1. **Submit-on-prompt** (used by /welcome): the user clicks a button
//    that fires `geolocation#request`. We `preventDefault`, ask for the
//    GPS prompt, and then submit the form regardless of grant/denial.
//    A `denied` target gets flipped to "1" when the prompt fails so the
//    server can surface a hint.
//
// 2. **Autofill-on-connect** (used by /notes/new): the form has hidden
//    `latitude` / `longitude` targets. On `connect` we read the GPS and
//    fill them. The user can submit normally.
export default class extends Controller {
  static targets = ["form", "denied", "latitude", "longitude"]

  connect() {
    if (this.hasLatitudeTarget && this.hasLongitudeTarget) {
      this.autofillCoords()
    }
  }

  request(event) {
    event.preventDefault()

    if (!navigator.geolocation) {
      this.submit(true)
      return
    }

    navigator.geolocation.getCurrentPosition(
      () => this.submit(false),
      () => this.submit(true),
      // High accuracy: force GPS over IP-based geolocation. The compose
      // form persists these coordinates as the note's anchor, so being
      // off by kilometres would make the user's own whisper invisible
      // when /map polls /notes/nearby a moment later.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    )
  }

  // ── private ──────────────────────────────────────────────────

  submit(denied) {
    if (denied && this.hasDeniedTarget) {
      this.deniedTarget.value = "1"
    }
    this.formTarget.requestSubmit()
  }

  autofillCoords() {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.latitudeTarget.value  = pos.coords.latitude
        this.longitudeTarget.value = pos.coords.longitude
      },
      () => {
        // Leave coords empty. Server-side validation will refuse the
        // submit and the form will re-render with an error.
      },
      // High accuracy: force GPS over IP-based geolocation. The compose
      // form persists these coordinates as the note's anchor, so being
      // off by kilometres would make the user's own whisper invisible
      // when /map polls /notes/nearby a moment later.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    )
  }
}
