import { Controller } from "@hotwired/stimulus"

// Auto-dismissing flash banner with tap-to-close and swipe-to-dismiss.
//
// The Rails layout renders one of these per flash entry. After
// `timeout` ms the banner slides out on its own. The user can also
// tap the × button or swipe horizontally past `swipeThreshold` px to
// close it sooner.
//
// The DOM is removed from the document after the close animation —
// no orphan banners stack up across navigations.
export default class extends Controller {
  static values = {
    timeout:        { type: Number, default: 5000 },
    swipeThreshold: { type: Number, default: 80 }
  }

  connect() {
    this.dismissed = false
    this.startX = null
    this.deltaX = 0
    this.autoTimer = setTimeout(() => this.dismiss(), this.timeoutValue)

    // Bound handlers so we can remove them on disconnect.
    this._onTouchStart = this._onTouchStart.bind(this)
    this._onTouchMove  = this._onTouchMove.bind(this)
    this._onTouchEnd   = this._onTouchEnd.bind(this)

    this.element.addEventListener("touchstart", this._onTouchStart, { passive: true })
    this.element.addEventListener("touchmove",  this._onTouchMove,  { passive: true })
    this.element.addEventListener("touchend",   this._onTouchEnd)
  }

  disconnect() {
    clearTimeout(this.autoTimer)
    this.element.removeEventListener("touchstart", this._onTouchStart)
    this.element.removeEventListener("touchmove",  this._onTouchMove)
    this.element.removeEventListener("touchend",   this._onTouchEnd)
  }

  // Triggered by the × button.
  close(event) {
    event?.preventDefault()
    this.dismiss()
  }

  // ── private ──────────────────────────────────────────────────

  _onTouchStart(event) {
    if (event.touches.length !== 1) return
    this.startX = event.touches[0].clientX
    this.deltaX = 0
    this.element.style.transition = "none"
  }

  _onTouchMove(event) {
    if (this.startX == null) return
    this.deltaX = event.touches[0].clientX - this.startX
    this.element.style.transform = `translateX(${this.deltaX}px)`
    // Fade as the user drags.
    const fade = Math.min(Math.abs(this.deltaX) / 200, 1)
    this.element.style.opacity = String(1 - fade * 0.85)
  }

  _onTouchEnd() {
    if (this.startX == null) return
    this.element.style.transition = ""

    if (Math.abs(this.deltaX) >= this.swipeThresholdValue) {
      // Fling out in the swipe direction.
      const direction = this.deltaX > 0 ? 1 : -1
      this.element.style.transform = `translateX(${direction * window.innerWidth}px)`
      this.element.style.opacity = "0"
      setTimeout(() => this._remove(), 220)
      this.dismissed = true
      clearTimeout(this.autoTimer)
    } else {
      this.element.style.transform = ""
      this.element.style.opacity = ""
    }

    this.startX = null
    this.deltaX = 0
  }

  dismiss() {
    if (this.dismissed) return
    this.dismissed = true
    clearTimeout(this.autoTimer)
    this.element.classList.add("gw-flash--leaving")
    setTimeout(() => this._remove(), 220)
  }

  _remove() {
    this.element.remove()
  }
}
