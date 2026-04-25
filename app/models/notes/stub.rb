module Notes
  # Plain value object with the same shape as the future Note record
  # (Phase 1, owned by a colleague). Used by `Notes::Catalog` while the
  # real ActiveRecord model is being built. Mirrors the public surface
  # the controllers and views consume so the swap is mechanical.
  #
  # Deletion plan: when the Note model lands in main, delete this file
  # and `Notes::Catalog`. See doc/next-steps.md.
  Stub = Struct.new(:id, :content, :latitude, :longitude,
                    :expires_at, :max_views, :views_count, :language,
                    :user_id, :distance_m,
                    keyword_init: true) do
    # Mean Earth radius used by the Haversine distance formula, in meters.
    EARTH_RADIUS_M = 6_371_000.0

    # No-op that mirrors the real `Note#view!` instance method so the
    # detail controller can call it from day one.
    #
    # @return [Stub] self, unchanged.
    # @note TODO[phase-1-merge]: replace with real semantics once Note
    #   exists (atomically increment `views_count` and return whether the
    #   note is still alive).
    def view!
      self
    end

    # Seconds until this note expires by time.
    #
    # @return [Integer, nil] seconds remaining (floored at 0 for past
    #   timestamps), or `nil` when the note never expires by time.
    def time_left_seconds
      return nil if expires_at.nil?

      [ (expires_at - Time.current).to_i, 0 ].max
    end

    # Views left before the note expires by view count.
    #
    # @return [Integer, nil] remaining reads (floored at 0), or `nil` when
    #   the note has no max-view cap.
    def views_remaining
      return nil if max_views.nil?

      [ max_views - views_count, 0 ].max
    end

    # Whether the note is still alive — not expired by time and not over
    # its view cap. Mirrors the real `Note.active` scope predicate.
    #
    # @return [Boolean]
    def active?
      not_expired = expires_at.nil? || expires_at > Time.current
      under_views = max_views.nil? || views_count < max_views

      not_expired && under_views
    end

    # Great-circle distance between this note and an arbitrary point.
    #
    # @param lat [Float] latitude of the other point in WGS84 decimal.
    # @param lng [Float] longitude of the other point in WGS84 decimal.
    # @return [Integer] distance in meters, rounded.
    def distance_to_m(lat, lng)
      lat1 = latitude * Math::PI / 180
      lat2 = lat * Math::PI / 180
      d_lat = (lat - latitude) * Math::PI / 180
      d_lng = (lng - longitude) * Math::PI / 180
      a = (Math.sin(d_lat / 2)**2) +
          (Math.cos(lat1) * Math.cos(lat2) * (Math.sin(d_lng / 2)**2))
      c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      (EARTH_RADIUS_M * c).round
    end

    # Serialised payload matching the JSON contract documented in
    # doc/plans/phase_2_map_and_compose.md.
    #
    # @return [Hash{Symbol=>Object}] only the keys exposed to the client.
    def as_json_payload
      {
        id: id,
        content: content,
        latitude: latitude,
        longitude: longitude,
        distance_m: distance_m,
        language: language,
        time_left_seconds: time_left_seconds,
        views_remaining: views_remaining
      }
    end
  end
end
