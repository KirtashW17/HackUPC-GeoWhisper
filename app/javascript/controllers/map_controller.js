import { Controller } from "@hotwired/stimulus"
// Leaflet 1.9.4 ESM only ships named exports (no default), so import as
// a namespace object to access factories like `L.map`, `L.tileLayer`, …
import * as L from "leaflet"

// Drives the /map screen. Owns a Leaflet instance, the geolocation
// state machine and the peek/empty/list/denied UI swaps.
//
// State is kept on the wrapper as `data-map-state="loading|ready|empty|denied"`.
// Targets toggle their `hidden` attribute based on state. This avoids
// per-target Tailwind variants and makes manual debugging trivial in
// devtools (just set the attribute).
export default class extends Controller {
  static targets = [
    "loading", "denied", "empty",
    "map", "list", "peek",
    "header", "counter", "toggleMap", "toggleList"
  ]
  static values = {
    nearbyUrl: String,
    radius:    { type: Number, default: 1000 },
    i18n:      Object
  }

  connect() {
    this.view = "map"
    if (!navigator.geolocation) {
      this.setState("denied")
      return
    }
    this.requestLocation()
  }

  disconnect() {
    this.leaflet?.remove()
    this.leaflet = null
  }

  retry(event) {
    event?.preventDefault()
    this.requestLocation()
  }

  showMap(event) {
    event?.preventDefault()
    this.view = "map"
    this.applyView()
  }

  showList(event) {
    event?.preventDefault()
    this.view = "list"
    this.applyView()
  }

  // ── private ──────────────────────────────────────────────────

  requestLocation() {
    this.setState("loading")
    navigator.geolocation.getCurrentPosition(
      (pos) => this.onLocation(pos.coords),
      ()    => this.setState("denied"),
      { timeout: 10000, maximumAge: 0 }
    )
  }

  async onLocation({ latitude, longitude }) {
    this.userLat = latitude
    this.userLng = longitude
    this.initLeaflet()
    await this.fetchNearby()
  }

  initLeaflet() {
    if (this.leaflet) {
      this.leaflet.setView([this.userLat, this.userLng], 16)
      this.youAreHere?.setLatLng([this.userLat, this.userLng])
      return
    }

    // Reveal the map container before init so Leaflet can measure.
    this.mapTarget.hidden = false

    this.leaflet = L.map(this.mapTarget, {
      zoomControl: false,
      attributionControl: true
    }).setView([this.userLat, this.userLng], 16)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.leaflet)

    this.youAreHere = L.marker([this.userLat, this.userLng], {
      icon: L.divIcon({
        className: "gw-pin-here",
        html: '<span class="gw-pin-here__pulse"></span><span class="gw-pin-here__dot"></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      }),
      keyboard: false,
      zIndexOffset: 1000
    }).addTo(this.leaflet)
  }

  async fetchNearby() {
    const url = `${this.nearbyUrlValue}?lat=${this.userLat}&lng=${this.userLng}&radius=${this.radiusValue}`
    let payload
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      payload = await res.json()
    } catch (e) {
      console.error("[map] failed to fetch nearby notes", e)
      this.setState("denied")
      return
    }

    this.notes = payload.notes || []
    this.renderMarkers()
    this.renderPeek()
    this.renderList()
    this.updateCounter()
    this.setState(this.notes.length === 0 ? "empty" : "ready")
  }

  renderMarkers() {
    (this.markers || []).forEach((m) => m.remove())
    this.markers = this.notes.map((note) => (
      L.marker([note.latitude, note.longitude], {
        icon: L.divIcon({
          className: "gw-pin",
          html: '<span class="gw-pin__dot"></span>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(this.leaflet).on("click", () => {
        window.location.href = `/notes/${note.id}`
      })
    ))
  }

  renderPeek() {
    if (this.notes.length === 0) {
      this.peekTarget.innerHTML = ""
      return
    }
    const closest = this.notes[0]
    this.peekTarget.innerHTML = this.cardHTML(closest, { closest: true })
  }

  renderList() {
    if (this.notes.length === 0) {
      this.listTarget.innerHTML = ""
      return
    }
    this.listTarget.innerHTML = this.notes.map((n) => this.cardHTML(n)).join("")
  }

  updateCounter() {
    const count = this.notes.length
    const radius = this.formatRadius(this.radiusValue)
    // Plain string — server-rendered translations would be cleaner but
    // the count is dynamic. Picks the closest plural form on the
    // server's behalf.
    if (count === 0) {
      this.counterTarget.textContent = `0 · ${radius}`
    } else if (count === 1) {
      this.counterTarget.textContent = `1 · ${radius}`
    } else {
      this.counterTarget.textContent = `${count} · ${radius}`
    }
  }

  cardHTML(note, opts = {}) {
    const closest = opts.closest
      ? `<span class="font-mono text-[10px] uppercase tracking-eyebrow text-accent">· ${this.escape(this.i18nValue.closest)}</span>`
      : ""

    const meta = [
      `<span class="inline-flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#b6552c" stroke-width="1.6"><path d="M12 2c-3.866 0-7 3.134-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7Z"/></svg>${note.distance_m}m</span>`,
      this.timeChip(note.time_left_seconds),
      this.viewsChip(note.views_remaining)
    ].filter(Boolean).join('<span class="inline-block h-[2px] w-[2px] rounded-full bg-ink-faint"></span>')

    return `
      <a href="/notes/${note.id}"
         class="relative block rounded-card border border-card-edge bg-card px-4 py-3.5 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.25)]">
        <div class="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-accent">
          ${note.distance_m}m ${closest}
        </div>
        <p class="mt-1.5 font-serif text-base leading-6 text-ink">${this.escape(note.content)}</p>
        <div class="mt-2.5 flex items-center gap-2 font-mono text-[10px] text-ink-soft">
          ${meta}
          <span class="ml-auto rounded-sm bg-bg-deep px-1.5 py-0.5 text-ink-soft">${this.escape(note.language || "").toUpperCase()}</span>
        </div>
      </a>
    `.trim()
  }

  timeChip(seconds) {
    if (seconds === null || seconds === undefined) {
      return `<span>${this.escape(this.i18nValue.no_time_limit)}</span>`
    }
    if (seconds < 60) return "<span>&lt;1m</span>"
    if (seconds < 3600) return `<span>${Math.floor(seconds / 60)}m</span>`
    if (seconds < 86400) {
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      return `<span>${h}h ${m}m</span>`
    }
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    return `<span>${d}d ${h}h</span>`
  }

  viewsChip(remaining) {
    if (remaining === null || remaining === undefined) {
      return `<span>${this.escape(this.i18nValue.unlimited_views)}</span>`
    }
    return `<span>${remaining} reads</span>`
  }

  formatRadius(meters) {
    if (meters >= 1000) return `${(meters / 1000).toFixed(0)}km`
    return `${meters}m`
  }

  setState(state) {
    this.element.dataset.mapState = state
    this.applyView()
  }

  applyView() {
    const state = this.element.dataset.mapState

    this.loadingTarget.hidden = state !== "loading"
    this.deniedTarget.hidden  = state !== "denied"

    const ready = state === "ready" || state === "empty"
    this.headerTarget.hidden  = !ready

    const showMap  = ready && this.view === "map"
    const showList = ready && this.view === "list"

    this.mapTarget.hidden  = !showMap
    this.peekTarget.hidden = !showMap
    this.emptyTarget.hidden = !(showMap && state === "empty")
    this.listTarget.hidden = !showList

    // Toggle pill highlight.
    if (this.hasToggleMapTarget && this.hasToggleListTarget) {
      this.toggleMapTarget.classList.toggle("bg-card", showMap)
      this.toggleMapTarget.classList.toggle("text-ink", showMap)
      this.toggleMapTarget.classList.toggle("text-ink-soft", !showMap)
      this.toggleListTarget.classList.toggle("bg-card", showList)
      this.toggleListTarget.classList.toggle("text-ink", showList)
      this.toggleListTarget.classList.toggle("text-ink-soft", !showList)
    }

    // Re-measure Leaflet after a hidden→visible swap.
    if (showMap && this.leaflet) {
      requestAnimationFrame(() => this.leaflet.invalidateSize())
    }
  }

  escape(str) {
    if (str === null || str === undefined) return ""
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;")
  }
}
