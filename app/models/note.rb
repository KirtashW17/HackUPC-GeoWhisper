# A geolocated, ephemeral whisper. Lives at a {#latitude}/{#longitude} pair,
# is visible to anyone within range until it either runs out of time
# (+expires_at+) or out of reads (+max_views+), at which point the +active+
# scope hides it.
#
# This model owns the *presentation* surface that the map JSON feed and the
# detail screen consume (+as_json_payload+, +time_left_seconds+,
# +views_remaining+, +distance_to_m+). Mixing presentation into the AR model
# keeps the controller path straight while we ship; extracting it into a
# dedicated presenter is registered as tech debt in +doc/future.md+.
class Note < ApplicationRecord
  # Hard cap on the radius accepted by {.nearby}, in meters. Beyond this we
  # would need PostGIS-grade indexing — see +doc/future.md+.
  MAX_RADIUS_M = 5_000

  # Mean Earth radius used by the Haversine distance formula.
  EARTH_RADIUS_M = 6_371_000.0

  belongs_to :user

  enum :visibility, { public_note: 0, private_note: 1, friends_only: 2 }

  validates :latitude, presence: true, numericality: { greater_than_or_equal_to: -90, less_than_or_equal_to: 90 }
  validates :longitude, presence: true, numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 }
  validates :max_views, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validates :content, length: { in: 1..500 }, presence: true
  validates :expires_at, numericality: { greater_than_or_equal_to: ->(note) { note.created_at || DateTime.current } }, allow_nil: true

  scope :active, -> {
    where(archived: false)
      .where("expires_at IS NULL OR expires_at > ?", DateTime.current)
      .where("max_views IS NULL OR views_count < max_views")
  }

  # Per-result virtual attribute populated by {.nearby}. Not persisted.
  # Pollutes the AR record with view state; accepted as tech debt while we
  # don't have a dedicated presenter (see +doc/future.md+).
  attr_accessor :distance_m

  # Register a view of this note, bumping +views_count+ and archiving the
  # note when it reaches +max_views+.
  #
  # No-ops in two cases:
  # 1. Private notes (delivery semantics for those will be defined later;
  #    counting reads on them is meaningless today).
  # 2. The viewer is the note's own author. Authors re-read their own
  #    whispers when checking on them or when navigating from their trail;
  #    those reads must not consume the budget or archive the note.
  #
  # @param viewer [User, nil] the user reading the note, or +nil+ for
  #   anonymous / system reads.
  # @return [void]
  def view!(viewer: nil)
    return if private_note?
    return if viewer && viewer == user

    self.views_count += 1
    if max_views.present? && views_count >= max_views
      self.archived = true
    end
    save!
  end

  # Mark this note as archived. Archived notes are excluded from the
  # +active+ scope, so they disappear from the nearby feed and from their
  # own detail page. Used by the "archive" action on the detail screen.
  #
  # Idempotent: calling on an already-archived note is a no-op.
  #
  # @return [Boolean] +true+ on save, mirroring AR's +update!+ contract.
  def archive!
    update!(archived: true)
  end

  # True when the note is hidden from the public-facing nearby feed —
  # either manually archived or beyond its time/views budget. Owners are
  # still allowed to read these from their personal trail; everybody
  # else gets +404+.
  #
  # @return [Boolean]
  def inactive?
    !vanished_reason.nil?
  end

  # Why the note is no longer active. Returned as a symbol so the view
  # layer can pick the right i18n key without re-running the predicates.
  #
  # @return [Symbol, nil] +:archived+, +:expired+, +:exhausted+, or +nil+
  #   when the note is still alive.
  def vanished_reason
    return :archived if archived?
    return :expired  if expires_at.present? && expires_at <= Time.current
    return :exhausted if max_views.present? && views_count >= max_views

    nil
  end

  # Active notes around a coordinate, sorted by ascending distance, with
  # +#distance_m+ populated on each result.
  #
  # SQLite has no native trig functions so we filter via a bounding box
  # (uses the +(latitude, longitude)+ index) and finish the radius check
  # in Ruby with the Haversine formula. Fine for hackathon-scale data;
  # PostGIS migration plan is in +doc/future.md+.
  #
  # The longitude span has to be widened by +1 / cos(lat)+ because one
  # degree of longitude is shorter than one degree of latitude away from
  # the equator. Skipping that correction was a real bug — at Barcelona
  # latitudes the box was ~25 % too narrow and clipped notes that were
  # genuinely within the radius. A small safety multiplier covers
  # GPS jitter so we don't flip notes in/out of the bounding box on
  # successive polls.
  #
  # @param lat [Float] searcher latitude in WGS84 decimal degrees.
  # @param lng [Float] searcher longitude in WGS84 decimal degrees.
  # @param radius_m [Integer] search radius in meters; clamped to
  #   {MAX_RADIUS_M}.
  # @return [Array<Note>] active notes within +radius_m+, with
  #   +#distance_m+ set, sorted ascending by distance.
  def self.nearby(lat:, lng:, radius_m: 1_000)
    effective_radius = [ radius_m, MAX_RADIUS_M ].min
    safety_margin    = 1.10
    lat_delta = (effective_radius * safety_margin) / 111_000.0
    cos_lat   = Math.cos(lat * Math::PI / 180).abs
    # Guard against the poles: when cos(lat) → 0 we fall back to
    # "every longitude" rather than dividing by ~0.
    lng_delta = cos_lat < 1e-6 ? 180.0 : lat_delta / cos_lat

    active
      .where(latitude:  (lat - lat_delta)..(lat + lat_delta))
      .where(longitude: (lng - lng_delta)..(lng + lng_delta))
      .each { |note| note.distance_m = note.distance_to_m(lat, lng) }
      .select { |note| note.distance_m <= effective_radius }
      .sort_by(&:distance_m)
  end

  # Seconds remaining until {#expires_at}.
  #
  # @return [Integer, nil] floored at 0 for past timestamps; +nil+ when the
  #   note has no time-based expiration.
  def time_left_seconds
    return nil if expires_at.nil?

    [ (expires_at - Time.current).to_i, 0 ].max
  end

  # Reads remaining before the note hits its view cap.
  #
  # @return [Integer, nil] floored at 0; +nil+ when the note has no cap.
  def views_remaining
    return nil if max_views.nil?

    [ max_views - views_count, 0 ].max
  end

  # Great-circle distance from this note to an arbitrary coordinate.
  #
  # @param lat [Float] other point's latitude in WGS84 decimal degrees.
  # @param lng [Float] other point's longitude in WGS84 decimal degrees.
  # @return [Integer] distance in meters, rounded.
  def distance_to_m(lat, lng)
    lat1 = latitude.to_f * Math::PI / 180
    lat2 = lat * Math::PI / 180
    d_lat = (lat - latitude.to_f) * Math::PI / 180
    d_lng = (lng - longitude.to_f) * Math::PI / 180
    a = (Math.sin(d_lat / 2)**2) +
        (Math.cos(lat1) * Math.cos(lat2) * (Math.sin(d_lng / 2)**2))
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    (EARTH_RADIUS_M * c).round
  end

  # Seconds elapsed since the note was created. Snapshot at call time —
  # the client formats it as "Xm/h/d ago" without recomputing against
  # server clock drift.
  #
  # @return [Integer] floored at 0; +0+ for notes that have not been
  #   persisted yet (no +created_at+).
  def seconds_since_publication
    return 0 if created_at.nil?

    [ (Time.current - created_at).to_i, 0 ].max
  end

  # Hash payload matching the JSON contract documented in
  # +doc/plans/phase_2_map_and_compose.md+ (consumed by the map's Stimulus
  # controller). Raw +expires_at+ stays server-side; the client receives
  # +seconds_since_publication+ for the time chip and the raw
  # +views_count+ / +max_views+ pair so it can render the +x/y+ ratio
  # (with +max_views = nil+ meaning "unlimited", rendered as +∞+).
  #
  # @return [Hash{Symbol => Object}]
  def as_json_payload
    {
      id: id,
      content: content,
      latitude: latitude.to_f,
      longitude: longitude.to_f,
      distance_m: distance_m,
      language: language,
      seconds_since_publication: seconds_since_publication,
      views_count: views_count,
      max_views: max_views
    }
  end
end
