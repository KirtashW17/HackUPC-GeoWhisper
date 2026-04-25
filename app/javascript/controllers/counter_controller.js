import { Controller } from "@hotwired/stimulus"

// Live character counter for textareas / inputs. Reads `maxlength` from
// the input and renders `current / max` into the readout target.
//
// Used by the compose form. Not specific to compose — drop it on any
// input + readout pair.
export default class extends Controller {
  static targets = ["input", "readout"]

  connect() {
    this.refresh()
  }

  refresh() {
    if (!this.hasInputTarget || !this.hasReadoutTarget) return

    const max     = this.inputTarget.maxLength
    const current = this.inputTarget.value.length

    this.readoutTarget.textContent =
      max > 0 ? `${current} / ${max}` : `${current}`
  }
}
