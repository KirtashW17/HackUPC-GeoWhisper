import { Controller } from "@hotwired/stimulus"

// Triggers a browser geolocation prompt before submitting a form.
// Used on the onboarding screen to request the GPS permission as
// part of the "Allow location & begin" CTA. The form submits in
// either case (granted or denied); when denied, the `denied` target
// is flipped to "1" so the server can flash an informative notice.
export default class extends Controller {
  static targets = ["form", "denied"]

  request(event) {
    event.preventDefault()

    if (!navigator.geolocation) {
      this.submit(true)
      return
    }

    navigator.geolocation.getCurrentPosition(
      () => this.submit(false),
      () => this.submit(true),
      { timeout: 10000, maximumAge: 0 }
    )
  }

  submit(denied) {
    if (denied && this.hasDeniedTarget) {
      this.deniedTarget.value = "1"
    }
    this.formTarget.requestSubmit()
  }
}
