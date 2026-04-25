import { Controller } from "@hotwired/stimulus"

// Live readout for an <input type="range">. Renders the current value
// into the readout target as the user drags. The readout text supports
// pluralisation via two `data-` template attrs:
//
//   data-range-readout-template-one-value="1 read"
//   data-range-readout-template-other-value="%{count} reads"
//
// When a template isn't provided, the controller falls back to the bare
// number.
//
// Used by the compose form for `max_views`. Generic enough to drop on any
// <input type="range"> + readout element pair.
export default class extends Controller {
  static targets = ["input", "readout"]
  static values = {
    templateOne:   { type: String, default: "" },
    templateOther: { type: String, default: "" }
  }

  connect() {
    this.refresh()
  }

  refresh() {
    if (!this.hasInputTarget || !this.hasReadoutTarget) return

    const count = Number(this.inputTarget.value)
    const tpl = count === 1 ? this.templateOneValue : this.templateOtherValue

    this.readoutTarget.textContent = tpl
      ? tpl.replace("%{count}", count)
      : String(count)
  }
}
