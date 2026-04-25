require "test_helper"

# Tests for the in-memory Notes::Catalog stub. Will be deleted when the
# real Note model lands (see doc/next-steps.md).
class Notes::CatalogTest < ActiveSupport::TestCase
  EPSEVG = [ 41.2236, 1.7280 ].freeze       # Vilanova i la Geltrú
  PLAÇA_REIAL = [ 41.3801, 2.1749 ].freeze   # Barri Gòtic
  CAMPUS_NORD = [ 41.3892, 2.1133 ].freeze   # UPC Barcelona

  test "DATA contains the demo fixtures across the three locations" do
    assert Notes::Catalog::DATA.size >= 9
    assert(Notes::Catalog::DATA.any? { |n| (n.latitude - EPSEVG[0]).abs < 0.01 })
    assert(Notes::Catalog::DATA.any? { |n| (n.latitude - PLAÇA_REIAL[0]).abs < 0.01 })
    assert(Notes::Catalog::DATA.any? { |n| (n.latitude - CAMPUS_NORD[0]).abs < 0.01 })
  end

  test "nearby returns notes within the radius" do
    nearby = Notes::Catalog.nearby(lat: EPSEVG[0], lng: EPSEVG[1], radius_m: 1_000)
    assert_predicate nearby.size, :positive?
    nearby.each { |n| assert n.distance_m <= 1_000, "got distance #{n.distance_m}m" }
  end

  test "nearby excludes notes outside the radius" do
    # 50m radius around EPSEVG should not include Plaça Reial (≈ 40 km away).
    nearby = Notes::Catalog.nearby(lat: EPSEVG[0], lng: EPSEVG[1], radius_m: 50)
    assert(nearby.none? { |n| (n.latitude - PLAÇA_REIAL[0]).abs < 0.01 })
  end

  test "nearby orders results by ascending distance" do
    nearby = Notes::Catalog.nearby(lat: EPSEVG[0], lng: EPSEVG[1], radius_m: 5_000)
    distances = nearby.map(&:distance_m)
    assert_equal distances.sort, distances
  end

  test "nearby caps the radius at 5000m" do
    far = Notes::Catalog.nearby(lat: EPSEVG[0], lng: EPSEVG[1], radius_m: 1_000_000)
    capped = Notes::Catalog.nearby(lat: EPSEVG[0], lng: EPSEVG[1], radius_m: 5_000)
    assert_equal capped.map(&:id), far.map(&:id)
  end

  test "nearby filters out notes whose expires_at has passed" do
    nearby = Notes::Catalog.nearby(lat: EPSEVG[0], lng: EPSEVG[1], radius_m: 5_000)
    nearby.each do |note|
      next if note.expires_at.nil?
      assert note.expires_at > Time.current, "got an expired note: #{note.id}"
    end
  end

  test "nearby filters out notes whose max_views has been reached" do
    nearby = Notes::Catalog.nearby(lat: EPSEVG[0], lng: EPSEVG[1], radius_m: 5_000)
    nearby.each do |note|
      next if note.max_views.nil?
      assert note.views_count < note.max_views, "got an over-viewed note: #{note.id}"
    end
  end

  test "find returns the note with the given id" do
    expected = Notes::Catalog::DATA.first
    assert_equal expected, Notes::Catalog.find(expected.id)
  end

  test "find accepts string ids (controller params)" do
    expected = Notes::Catalog::DATA.first
    assert_equal expected, Notes::Catalog.find(expected.id.to_s)
  end

  test "find returns nil when the id does not exist" do
    assert_nil Notes::Catalog.find(99_999)
  end

  test "Stub#view! is a no-op that returns self" do
    note = Notes::Catalog::DATA.first
    initial_views = note.views_count
    assert_equal note, note.view!
    assert_equal initial_views, note.views_count
  end

  test "Stub#time_left_seconds returns nil for permanent notes" do
    permanent = Notes::Stub.new(id: 0, content: "p", latitude: 0.0, longitude: 0.0,
                                 expires_at: nil, max_views: 1, views_count: 0,
                                 language: "en", user_id: 1)
    assert_nil permanent.time_left_seconds
  end

  test "Stub#time_left_seconds returns 0 for expired notes" do
    expired = Notes::Stub.new(id: 0, content: "e", latitude: 0.0, longitude: 0.0,
                               expires_at: 1.minute.ago, max_views: 5, views_count: 0,
                               language: "en", user_id: 1)
    assert_equal 0, expired.time_left_seconds
  end

  test "Stub#views_remaining returns nil when max_views is nil" do
    unlimited = Notes::Stub.new(id: 0, content: "u", latitude: 0.0, longitude: 0.0,
                                 expires_at: 1.hour.from_now, max_views: nil,
                                 views_count: 12, language: "en", user_id: 1)
    assert_nil unlimited.views_remaining
  end

  test "Stub#views_remaining returns max_views minus views_count, floored at 0" do
    note = Notes::Stub.new(id: 0, content: "n", latitude: 0.0, longitude: 0.0,
                            expires_at: 1.hour.from_now, max_views: 5, views_count: 2,
                            language: "en", user_id: 1)
    assert_equal 3, note.views_remaining

    over = Notes::Stub.new(id: 0, content: "o", latitude: 0.0, longitude: 0.0,
                            expires_at: 1.hour.from_now, max_views: 5, views_count: 10,
                            language: "en", user_id: 1)
    assert_equal 0, over.views_remaining
  end

  test "Stub#as_json_payload exposes only the fields in the API contract" do
    note = Notes::Stub.new(id: 7, content: "hi", latitude: 41.0, longitude: 2.0,
                            expires_at: 1.hour.from_now, max_views: 5, views_count: 1,
                            language: "ca", user_id: 1)
    note.distance_m = 42

    payload = note.as_json_payload
    assert_equal %i[id content latitude longitude distance_m language
                    time_left_seconds views_remaining].sort,
                 payload.keys.sort
    assert_equal 7, payload[:id]
    assert_equal 42, payload[:distance_m]
    assert_equal 4, payload[:views_remaining]
  end
end
