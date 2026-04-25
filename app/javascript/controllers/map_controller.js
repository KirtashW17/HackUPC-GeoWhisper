import { Controller } from "@hotwired/stimulus"
// Leaflet 1.9.4 ESM only ships named exports (no default), so import as
// a namespace object to access factories like `L.map`, `L.tileLayer`, …
import * as L from "leaflet"

// Pixels at which two pins fuse into a stacked cluster. Decided in
// doc/plans/phase_3_clustering.md §9.
const CLUSTER_THRESHOLD_PX = 40

// Drives the /map screen. Owns a Leaflet instance, the geolocation
// state machine, the peek/empty/list/denied UI swaps and the cluster
// bottom-sheet flow.
//
// State is kept on the wrapper as `data-map-state="loading|ready|empty|denied"`.
// Targets toggle their `hidden` attribute based on state. This avoids
// per-target Tailwind variants and makes manual debugging trivial in
// devtools (just set the attribute).
export default class extends Controller {
  static targets = [
    "loading", "denied", "empty",
    "map", "list", "peek",
    "header", "counter", "toggleMap", "toggleList",
    "overlay", "sheet", "sheetEyebrow", "sheetList", "closePill"
  ]
  static values = {
    nearbyUrl: String,
    radius:    { type: Number, default: 1000 },
    i18n:      Object
  }

  connect() {
    this.view = "map"
    this.openClusterId = null
    this._onKeydown = this._onKeydown.bind(this)
    document.addEventListener("keydown", this._onKeydown)
    if (!navigator.geolocation) {
      this.setState("denied")
      return
    }
    this.requestLocation()
  }

  disconnect() {
    document.removeEventListener("keydown", this._onKeydown)
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

  closeSheet(event) {
    event?.preventDefault()
    this.openClusterId = null
    this.sheetTarget.hidden = true
    this.overlayTarget.hidden = true
    this.closePillTarget.hidden = true
    this.applyView()
  }

  // ── private ──────────────────────────────────────────────────

  _onKeydown(event) {
    if (event.key === "Escape" && this.openClusterId) this.closeSheet()
  }

  requestLocation() {
    this.setState("loading")
    navigator.geolocation.getCurrentPosition(
      (pos) => this.onLocation(pos.coords),
      ()    => this.setState("denied"),
      // `enableHighAccuracy: true` forces the device to use GPS (or its
      // best high-accuracy source). Without it, the browser is free to
      // return IP-based coordinates that can be kilometres off — and a
      // user's freshly-dropped whisper would silently fall outside the
      // search radius. Slower (5–10 s indoors) but precision matters
      // more than latency here.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
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
      icon: this.hereIcon(0),
      keyboard: false,
      zIndexOffset: 1000
    }).addTo(this.leaflet)

    // Re-cluster whenever the projection changes (zoom / pan). Markers
    // are kept stable in lat/lng but their pixel distance to each other
    // and to the user pin shifts with the zoom level.
    this.leaflet.on("zoomend moveend", () => this.renderClusters())
  }

  // Build the divIcon for the "you are here" pin. When `count > 0` the
  // icon includes a corner badge (here-cluster). Re-issued instead of
  // mutated because Leaflet caches the icon HTML at marker creation.
  hereIcon(count) {
    const badge = count > 0
      ? `<button type="button" class="gw-pin-here__badge" data-here-badge="1" aria-label="${this.escape(this.i18nValue.cluster_here_eyebrow)}">${this.formatCount(count)}</button>`
      : ""
    return L.divIcon({
      className: "gw-pin-here",
      html: `<span class="gw-pin-here__pulse"></span><span class="gw-pin-here__dot"></span>${badge}`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
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
    this.renderClusters()
    this.renderList()
    this.updateCounter()
    this.setState(this.notes.length === 0 ? "empty" : "ready")
  }

  // Greedy O(n²) clusterer. Plan §4. Splits notes into:
  //   - hereCluster: notes within CLUSTER_THRESHOLD_PX of the user pin.
  //   - clusters[]: the rest, grouped by pixel proximity, anchored on
  //     each group's first note (most-stable choice across zooms).
  clusterize() {
    if (!this.leaflet || !this.notes) return { hereCluster: [], clusters: [] }

    const project = (lat, lng) => this.leaflet.latLngToContainerPoint([lat, lng])
    const here = project(this.userLat, this.userLng)
    const sqThreshold = CLUSTER_THRESHOLD_PX * CLUSTER_THRESHOLD_PX

    const sqDist = (a, b) => {
      const dx = a.x - b.x, dy = a.y - b.y
      return dx * dx + dy * dy
    }

    const hereCluster = []
    const remaining = []
    for (const note of this.notes) {
      const px = project(note.latitude, note.longitude)
      if (sqDist(px, here) < sqThreshold) {
        hereCluster.push(note)
      } else {
        remaining.push({ note, px })
      }
    }

    const clusters = []
    const taken = new Set()
    for (let i = 0; i < remaining.length; i++) {
      if (taken.has(i)) continue
      const anchor = remaining[i]
      const group = [anchor.note]
      taken.add(i)
      for (let j = i + 1; j < remaining.length; j++) {
        if (taken.has(j)) continue
        if (sqDist(anchor.px, remaining[j].px) < sqThreshold) {
          group.push(remaining[j].note)
          taken.add(j)
        }
      }
      clusters.push({
        id: `c_${anchor.note.id}`,
        anchor: anchor.note,
        notes: group,
        latitude: anchor.note.latitude,
        longitude: anchor.note.longitude
      })
    }

    return { hereCluster, clusters }
  }

  renderClusters() {
    if (!this.leaflet) return
    const { hereCluster, clusters } = this.clusterize()
    this.hereClusterNotes = hereCluster
    this.clusters = clusters

    // Drop previous marker objects before rebuilding. Cheap at this
    // scale (n ≤ ~200 per the radius cap).
    ;(this.markers || []).forEach((m) => m.remove())
    this.markers = clusters.map((cluster) => {
      const isSingle = cluster.notes.length === 1
      const marker = L.marker([cluster.latitude, cluster.longitude], {
        icon: isSingle ? this.singleIcon() : this.clusterIcon(cluster.notes.length)
      }).addTo(this.leaflet)

      if (isSingle) {
        marker.on("click", () => {
          window.location.href = this.noteHref(cluster.notes[0])
        })
      } else {
        marker.on("click", () => this.openClusterSheet(cluster))
      }
      return marker
    })

    // Refresh the "you are here" badge to reflect the here-cluster count.
    if (this.youAreHere) {
      this.youAreHere.setIcon(this.hereIcon(hereCluster.length))
      // Bind the badge tap (lives inside the divIcon HTML, so we have
      // to wire it post-render).
      const el = this.youAreHere.getElement()
      const badge = el?.querySelector("[data-here-badge]")
      if (badge && hereCluster.length > 0) {
        badge.addEventListener("click", (e) => {
          e.stopPropagation()
          this.openHereSheet()
        })
      }
    }

    this.renderPeek()
  }

  singleIcon() {
    return L.divIcon({
      className: "gw-pin",
      html: '<span class="gw-pin__pulse"></span><span class="gw-pin__dot"></span>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
  }

  clusterIcon(count) {
    const cls = count >= 10 ? "gw-pin-cluster gw-pin-cluster--lg" : "gw-pin-cluster"
    const dim = count >= 10 ? 52 : 40
    return L.divIcon({
      className: cls,
      html: `
        <span class="gw-pin-cluster__layer gw-pin-cluster__layer--bottom"></span>
        <span class="gw-pin-cluster__layer gw-pin-cluster__layer--mid"></span>
        <span class="gw-pin-cluster__layer gw-pin-cluster__layer--top">
          <span class="gw-pin-cluster__fold"></span>
          <span class="gw-pin-cluster__count">${this.formatCount(count)}</span>
        </span>
        <span class="gw-pin-cluster__anchor"></span>
      `.trim(),
      iconSize: [dim, dim],
      iconAnchor: [dim / 2, dim / 2]
    })
  }

  formatCount(count) {
    if (count >= 99) return "99+"
    if (count >= 10) return "9+"
    return String(count)
  }

  renderPeek() {
    if (!this.notes || this.notes.length === 0) {
      this.peekTarget.innerHTML = ""
      return
    }
    const closest = this.notes[0]

    // Is the closest note part of the here-cluster or a multi-note cluster?
    const inHere = (this.hereClusterNotes || []).some((n) => n.id === closest.id)
    if (inHere && this.hereClusterNotes.length > 1) {
      this.peekTarget.innerHTML = this.peekClusterHTML({
        count: this.hereClusterNotes.length,
        distanceM: 0,
        here: true
      })
      this.peekTarget.querySelector("[data-peek-cluster]")
        ?.addEventListener("click", () => this.openHereSheet())
      return
    }

    const cluster = (this.clusters || []).find((c) => c.notes.length > 1 && c.notes.some((n) => n.id === closest.id))
    if (cluster) {
      this.peekTarget.innerHTML = this.peekClusterHTML({
        count: cluster.notes.length,
        distanceM: cluster.anchor.distance_m
      })
      this.peekTarget.querySelector("[data-peek-cluster]")
        ?.addEventListener("click", () => this.openClusterSheet(cluster))
      return
    }

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

  // ── Cluster sheet (open / close / build) ─────────────────────

  openClusterSheet(cluster) {
    this.openClusterId = cluster.id
    const distance = cluster.anchor.distance_m
    const eyebrow = this.clusterEyebrow(cluster.notes.length, distance)
    this.showSheet(eyebrow, cluster.notes)
  }

  openHereSheet() {
    this.openClusterId = "here"
    this.showSheet(this.i18nValue.cluster_here_eyebrow, this.hereClusterNotes)
  }

  showSheet(eyebrow, notes) {
    this.sheetEyebrowTarget.textContent = eyebrow
    this.sheetListTarget.innerHTML = notes.map((n) => this.cardHTML(n)).join("")
    this.sheetTarget.hidden = false
    this.overlayTarget.hidden = false
    this.closePillTarget.hidden = false
    if (this.hasPeekTarget) this.peekTarget.hidden = true
  }

  clusterEyebrow(count, distanceM) {
    const tpl = count === 1 ? this.i18nValue.cluster_eyebrow_one : this.i18nValue.cluster_eyebrow_other
    let label = tpl.replace("%{count}", count)
    if (distanceM != null && distanceM > 0) {
      const distLabel = this.i18nValue.cluster_distance_away.replace("%{meters}", distanceM)
      label = `${label} · ${distLabel}`
    }
    return label
  }

  peekClusterHTML({ count, distanceM, here = false }) {
    const eyebrow = here
      ? this.i18nValue.cluster_here_eyebrow
      : this.clusterEyebrow(count, distanceM)
    const tpl = count === 1 ? this.i18nValue.cluster_peek_one : this.i18nValue.cluster_peek_other
    const headline = tpl
      .replace("%{count}", count)
      .replace("%{meters}", distanceM ?? 0)
    return `
      <button type="button"
              data-peek-cluster
              class="block w-full rounded-card border border-card-edge bg-card px-4 py-3.5 text-left shadow-[0_12px_30px_-18px_rgba(0,0,0,0.25)]">
        <p class="font-mono text-[10px] uppercase tracking-eyebrow text-accent">${this.escape(eyebrow)}</p>
        <p class="mt-1 font-serif text-base text-ink">${this.escape(headline)}</p>
      </button>
    `.trim()
  }

  cardHTML(note, opts = {}) {
    const closest = opts.closest
      ? `<span class="font-mono text-[10px] uppercase tracking-eyebrow text-accent">· ${this.escape(this.i18nValue.closest)}</span>`
      : ""

    const meta = [
      `<span class="inline-flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#b6552c" stroke-width="1.6"><path d="M12 2c-3.866 0-7 3.134-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7Z"/></svg>${note.distance_m}m</span>`,
      this.timeChip(note.seconds_since_publication),
      this.viewsChip(note.views_count, note.max_views)
    ].filter(Boolean).join('<span class="inline-block h-[2px] w-[2px] rounded-full bg-ink-faint"></span>')

    return `
      <a href="${this.noteHref(note)}"
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

  // "Time since publication" chip: clock icon + locale-aware "Xm/h/d ago".
  // Always rendered, regardless of whether the note carries an
  // `expires_at` — the listing intentionally does not surface remaining
  // time. The unit picked is the largest one that still rounds to >= 1.
  timeChip(seconds) {
    const value = Number(seconds) || 0
    let label
    if (value < 60) {
      label = this.i18nValue.time_ago_now
    } else if (value < 3600) {
      label = this.i18nValue.time_ago_minutes.replace("__N__", Math.floor(value / 60))
    } else if (value < 86400) {
      label = this.i18nValue.time_ago_hours.replace("__N__", Math.floor(value / 3600))
    } else {
      label = this.i18nValue.time_ago_days.replace("__N__", Math.floor(value / 86400))
    }
    return `<span class="inline-flex items-center gap-1">${this.clockSvg()}${this.escape(label)}</span>`
  }

  // "Reads consumed" chip: eye icon + `x/y` ratio. `y` collapses to ∞
  // when the note has no `max_views` cap.
  viewsChip(viewsCount, maxViews) {
    const x = Number.isFinite(Number(viewsCount)) ? Number(viewsCount) : 0
    const y = (maxViews === null || maxViews === undefined) ? "∞" : Number(maxViews)
    return `<span class="inline-flex items-center gap-1">${this.eyeSvg()}${x}/${y}</span>`
  }

  clockSvg() {
    return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
  }

  eyeSvg() {
    return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
  }

  // Build the link to a note's detail page, forwarding the viewer's
  // coordinates so the server can compute the "Xm away" eyebrow.
  noteHref(note) {
    if (this.userLat == null || this.userLng == null) return `/notes/${note.id}`
    return `/notes/${note.id}?lat=${this.userLat}&lng=${this.userLng}`
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

    const sheetOpen = !!this.openClusterId
    const showMap  = ready && this.view === "map"
    const showList = ready && this.view === "list"

    this.mapTarget.hidden  = !showMap
    this.peekTarget.hidden = !showMap || sheetOpen
    this.emptyTarget.hidden = !(showMap && state === "empty") || sheetOpen
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
