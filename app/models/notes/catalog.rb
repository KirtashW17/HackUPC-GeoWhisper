# In-memory stub of the future Note model. Lets us build the map, the
# /notes/nearby endpoint, the detail screen and the compose form before the
# real ActiveRecord-backed Note (Phase 1, owned by a colleague) lands. The
# public surface mirrors what the real Note is expected to expose so the
# swap is a 1-line change per call site.
#
# Deletion plan: when the Note model lands in main, delete this file and
# `app/models/notes/stub.rb` plus their tests. See doc/next-steps.md and
# doc/plans/phase_2_map_and_compose.md.
module Notes
  # Read-only catalogue of demo notes for the map/detail screens.
  module Catalog
    # Hard cap on the radius accepted by `.nearby`, in meters.
    MAX_RADIUS_M = 5_000

    # Hand-authored demo whispers grouped by location (EPSEVG, Plaça
    # Reial, Campus Nord). Includes intentionally expired and over-cap
    # entries so {.nearby} has something to filter out.
    DATA = [
      # ── EPSEVG · Vilanova i la Geltrú ─────────────────────────────
      Stub.new(id: 1, language: "en", user_id: 1,
               content: "Sit by the window — they bring out the saffron buns at 4.",
               latitude: 41.2238, longitude: 1.7282,
               expires_at: 4.hours.from_now, max_views: 8, views_count: 3),

      Stub.new(id: 2, language: "ca", user_id: 2,
               content: "El pati de darrere té un banc on encara hi ha tinta del 2017. Mira amb llum lateral.",
               latitude: 41.2241, longitude: 1.7275,
               expires_at: 2.days.from_now, max_views: 5, views_count: 1),

      Stub.new(id: 3, language: "es", user_id: 3,
               content: "Cuidado con el escalón doble en la entrada norte cuando llueve.",
               latitude: 41.2233, longitude: 1.7285,
               expires_at: 12.hours.from_now, max_views: 25, views_count: 9),

      # Permanent: never expires by time.
      Stub.new(id: 4, language: "en", user_id: 1,
               content: "If you've made it this far into the term, you're going to be alright.",
               latitude: 41.2236, longitude: 1.7280,
               expires_at: nil, max_views: 200, views_count: 47),

      # Past expiration — must be filtered out by .nearby.
      Stub.new(id: 5, language: "ca", user_id: 2,
               content: "Hackathon brunch a les 10 a la cafeteria. (Ja ha passat.)",
               latitude: 41.2240, longitude: 1.7278,
               expires_at: 1.hour.ago, max_views: 50, views_count: 12),

      # Over the view cap — must be filtered out by .nearby.
      Stub.new(id: 6, language: "es", user_id: 3,
               content: "El proyector del aula 04 viene con cable HDMI; no hace falta el adaptador.",
               latitude: 41.2234, longitude: 1.7290,
               expires_at: 6.hours.from_now, max_views: 3, views_count: 3),

      # ── Plaça Reial · Barri Gòtic ────────────────────────────────
      Stub.new(id: 7, language: "en", user_id: 1,
               content: "Look up. The lampposts in this square were Gaudí's first commission.",
               latitude: 41.3801, longitude: 2.1749,
               expires_at: 3.days.from_now, max_views: 100, views_count: 38),

      Stub.new(id: 8, language: "ca", user_id: 2,
               content: "Si véns un dimecres a la nit, hi ha jam de jazz al fons. Free.",
               latitude: 41.3805, longitude: 2.1745,
               expires_at: 6.days.from_now, max_views: 60, views_count: 14),

      # ── Campus Nord · UPC Barcelona ──────────────────────────────
      # Unlimited views: max_views nil — must still appear in .nearby
      # as long as it isn't expired.
      Stub.new(id: 9, language: "en", user_id: 3,
               content: "The vending machine on B6 still takes coins. The one on A4 doesn't.",
               latitude: 41.3892, longitude: 2.1133,
               expires_at: 5.days.from_now, max_views: nil, views_count: 0)
    ].freeze

    # Notes near a given coordinate that are still active, sorted by
    # ascending distance.
    #
    # @param lat [Float] latitude of the searcher in WGS84 decimal.
    # @param lng [Float] longitude of the searcher in WGS84 decimal.
    # @param radius_m [Integer] search radius in meters; clamped to
    #   `MAX_RADIUS_M` (5000).
    # @return [Array<Stub>] active notes within `radius_m`, each with
    #   `distance_m` populated.
    def self.nearby(lat:, lng:, radius_m: 1_000)
      effective_radius = [ radius_m, MAX_RADIUS_M ].min

      DATA
        .select(&:active?)
        .map { |note| note.dup.tap { |dup| dup.distance_m = note.distance_to_m(lat, lng) } }
        .select { |note| note.distance_m <= effective_radius }
        .sort_by(&:distance_m)
    end

    # Lookup by id. Mirrors `Note.find` semantics except it returns `nil`
    # instead of raising on miss — keep this in mind when swapping to the
    # real model (use `find_by(id:)` or rescue `ActiveRecord::RecordNotFound`).
    #
    # @param id [Integer, String] id of the note.
    # @return [Stub, nil]
    def self.find(id)
      DATA.find { |note| note.id == id.to_i }
    end
  end
end
