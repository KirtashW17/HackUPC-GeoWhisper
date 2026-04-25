require "test_helper"

class NoteTest < ActiveSupport::TestCase
  def setup
    @user = users(:alice)
  end

  def valid_attrs(overrides = {})
    {
      user: @user,
      content: "This is a note.",
      latitude: 41.3874,
      longitude: 2.1686
    }.merge(overrides)
  end

  test "valid with full attributes" do
    assert Note.new(valid_attrs).valid?
  end

  test "requires user" do
    note = Note.new(valid_attrs(user: nil))
    assert_not note.valid?
    assert note.errors[:user].any?
  end

  test "requires content" do
    note = Note.new(valid_attrs(content: nil))
    assert_not note.valid?
    assert note.errors[:content].any?
  end

  test "content must be between 1 and 500 characters" do
    note = Note.new(valid_attrs(content: ""))
    assert_not note.valid?
    assert note.errors[:content].any?

    note.content = "a" * 501
    assert_not note.valid?
    assert note.errors[:content].any?

    note.content = "Valid content"
    assert note.valid?
  end

  test "requires latitude and longitude" do
    note = Note.new(valid_attrs(latitude: nil, longitude: nil))
    assert_not note.valid?
    assert note.errors[:latitude].any?
    assert note.errors[:longitude].any?
  end

  test "latitude must be between -90 and 90" do
    note = Note.new(valid_attrs(latitude: -91))
    assert_not note.valid?
    assert note.errors[:latitude].any?

    note.latitude = 91
    assert_not note.valid?
    assert note.errors[:latitude].any?

    note.latitude = 45
    assert note.valid?
  end

  test "longitude must be between -180 and 180" do
    note = Note.new(valid_attrs(longitude: -181))
    assert_not note.valid?
    assert note.errors[:longitude].any?

    note.longitude = 181
    assert_not note.valid?
    assert note.errors[:longitude].any?

    note.longitude = 90
    assert note.valid?
  end

  test "max_views must be a positive integer if present" do
    note = Note.new(valid_attrs(max_views: -1))
    assert_not note.valid?
    assert note.errors[:max_views].any?

    note.max_views = 0
    assert_not note.valid?
    assert note.errors[:max_views].any?

    note.max_views = 1.5
    assert_not note.valid?
    assert note.errors[:max_views].any?

    note.max_views = 10
    assert note.valid?
  end

  test "expires_at must be in the future if present" do
    note = Note.new(valid_attrs(expires_at: 1.day.ago))
    assert_not note.valid?
    assert note.errors[:expires_at].any?

    note.expires_at = Time.current + 1.day
    assert note.valid?
  end

  test "view! increments views_count and respects max_views" do
    note = Note.create!(valid_attrs(max_views: 2))
    assert_equal 0, note.views_count

    note.view!
    assert_equal 1, note.views_count
    assert note.public_note?

    note.view!
    assert_equal 2, note.views_count
    assert note.archived?
  end

  test "view! does not increment views_count for private notes" do
    note = Note.create!(valid_attrs(visibility: :private_note))
    assert_equal 0, note.views_count

    note.view!
    assert_equal 0, note.views_count
    assert note.private_note?
  end

  test "active scope returns only active notes" do
    active_note = Note.create!(valid_attrs)
    expired_note = Note.create!(valid_attrs(expires_at: Time.current - 1.second))
    maxed_out_note = Note.create!(valid_attrs(max_views: 1))
    maxed_out_note.view!

    assert_includes Note.active, active_note
    assert_not_includes Note.active, expired_note
    assert_not_includes Note.active, maxed_out_note
  end

  test "visibility enum works correctly" do
    note = Note.new(valid_attrs)
    note.public_note!
    assert note.public_note?

    note.private_note!
    assert note.private_note?

    note.friends_only!
    assert note.friends_only?
  end

  test "belongs to user" do
    note = Note.new(valid_attrs)
    assert note.user
    assert_equal @user, note.user
  end

  # ── Presentation surface (consumed by NotesController + map JSON) ──

  test "time_left_seconds returns nil for permanent notes" do
    note = Note.new(valid_attrs(expires_at: nil))
    assert_nil note.time_left_seconds
  end

  test "time_left_seconds returns the gap to expires_at, floored at 0" do
    note = Note.new(valid_attrs(expires_at: Time.current + 30.minutes))
    assert_in_delta 30 * 60, note.time_left_seconds, 5

    note.expires_at = 1.minute.ago
    assert_equal 0, note.time_left_seconds
  end

  test "views_remaining returns nil when max_views is nil" do
    note = Note.new(valid_attrs(max_views: nil, views_count: 12))
    assert_nil note.views_remaining
  end

  test "views_remaining returns max_views minus views_count, floored at 0" do
    note = Note.new(valid_attrs(max_views: 5, views_count: 2))
    assert_equal 3, note.views_remaining

    over = Note.new(valid_attrs(max_views: 5, views_count: 10))
    assert_equal 0, over.views_remaining
  end

  test "distance_to_m returns 0 when comparing a note against its own coords" do
    note = Note.new(valid_attrs(latitude: 41.3892, longitude: 2.1133))
    assert_equal 0, note.distance_to_m(41.3892, 2.1133)
  end

  test "distance_to_m matches the Haversine reference for known points" do
    # Plaça Reial (41.3801, 2.1749) → Campus Nord (41.3892, 2.1133): ~5.3 km.
    placa = Note.new(valid_attrs(latitude: 41.3801, longitude: 2.1749))
    assert_in_delta 5_300, placa.distance_to_m(41.3892, 2.1133), 200
  end

  test "as_json_payload exposes only the contract keys" do
    note = Note.create!(valid_attrs(language: "ca", max_views: 4,
                                    expires_at: 1.hour.from_now))
    note.distance_m = 42

    payload = note.as_json_payload
    assert_equal %i[id content latitude longitude distance_m language
                    time_left_seconds views_remaining].sort,
                 payload.keys.sort
    assert_equal note.id, payload[:id]
    assert_equal 42, payload[:distance_m]
    assert_equal "ca", payload[:language]
    assert_equal 4, payload[:views_remaining]
  end

  # ── .nearby class method ──────────────────────────────────────

  test "nearby returns active notes within the given radius" do
    here = Note.create!(valid_attrs(latitude: 41.3892, longitude: 2.1133,
                                    content: "right here"))

    results = Note.nearby(lat: 41.3892, lng: 2.1133, radius_m: 500)
    assert_includes results.map(&:id), here.id
  end

  test "nearby populates distance_m on each returned note" do
    Note.create!(valid_attrs(latitude: 41.3892, longitude: 2.1133,
                             content: "here"))
    results = Note.nearby(lat: 41.3892, lng: 2.1133, radius_m: 1_000)
    assert(results.all? { |n| n.distance_m.is_a?(Numeric) })
  end

  test "nearby orders results by ascending distance" do
    Note.create!(valid_attrs(latitude: 41.3892, longitude: 2.1133, content: "near"))
    Note.create!(valid_attrs(latitude: 41.3950, longitude: 2.1133, content: "mid"))
    Note.create!(valid_attrs(latitude: 41.4040, longitude: 2.1133, content: "far"))

    results = Note.nearby(lat: 41.3892, lng: 2.1133, radius_m: 5_000)
    distances = results.map(&:distance_m)
    assert_equal distances.sort, distances
  end

  test "nearby excludes notes outside the radius" do
    Note.create!(valid_attrs(latitude: 41.3892, longitude: 2.1133, content: "here"))
    far = Note.create!(valid_attrs(latitude: 41.5000, longitude: 2.5000, content: "far"))

    results = Note.nearby(lat: 41.3892, lng: 2.1133, radius_m: 1_000)
    assert_not_includes results.map(&:id), far.id
  end

  test "nearby excludes expired notes" do
    expired = Note.create!(valid_attrs(latitude: 41.3892, longitude: 2.1133,
                                       expires_at: 2.hours.from_now,
                                       content: "soon"))
    expired.update_column(:expires_at, 1.hour.ago)

    results = Note.nearby(lat: 41.3892, lng: 2.1133, radius_m: 1_000)
    assert_not_includes results.map(&:id), expired.id
  end

  test "nearby excludes over-capped notes" do
    capped = Note.create!(valid_attrs(latitude: 41.3892, longitude: 2.1133,
                                      max_views: 1, content: "limit"))
    capped.view!

    results = Note.nearby(lat: 41.3892, lng: 2.1133, radius_m: 1_000)
    assert_not_includes results.map(&:id), capped.id
  end

  test "nearby caps the radius at MAX_RADIUS_M" do
    Note.create!(valid_attrs(latitude: 41.3892, longitude: 2.1133, content: "here"))
    too_far = Note.create!(valid_attrs(latitude: 42.0,    longitude: 3.0,
                                       content: "way too far"))

    results = Note.nearby(lat: 41.3892, lng: 2.1133, radius_m: 1_000_000)
    assert_not_includes results.map(&:id), too_far.id
  end

  test "nearby includes permanent and unlimited-view notes" do
    permanent = Note.create!(valid_attrs(latitude: 41.3892, longitude: 2.1133,
                                         expires_at: nil, content: "forever"))
    unlimited = Note.create!(valid_attrs(latitude: 41.3893, longitude: 2.1133,
                                         max_views: nil, content: "no cap"))

    ids = Note.nearby(lat: 41.3892, lng: 2.1133, radius_m: 1_000).map(&:id)
    assert_includes ids, permanent.id
    assert_includes ids, unlimited.id
  end

  # Regression: at non-equatorial latitudes 1° of longitude spans much
  # less than 1° of latitude, so a naive `delta = radius_m / 111_000`
  # bounding box clips the longitude axis. A note that is genuinely
  # within the radius (Haversine) must still be returned even when its
  # `lng - user_lng` is wider than what the latitude-based delta would
  # have accepted.
  test "nearby still returns notes near the longitude edge of the radius" do
    user_lat = 41.4   # Barcelona-ish; 1° lng ≈ 84 km, 1° lat ≈ 111 km.
    user_lng = 2.0
    # ~3.5 km to the east, well within a 5 km radius. With a naive
    # delta = 5000 / 111_000 ≈ 0.045°, the lng box would only span
    # ~3.78 km, just barely catching this — at 4 km it would miss.
    east = Note.create!(valid_attrs(latitude: user_lat,
                                    longitude: user_lng + 0.047,
                                    content: "east edge"))

    ids = Note.nearby(lat: user_lat, lng: user_lng, radius_m: 5_000).map(&:id)
    assert_includes ids, east.id
  end

  test "nearby still excludes a note that is past the longitude edge" do
    user_lat = 41.4
    user_lng = 2.0
    # 8 km east — outside the 5 km radius regardless of the box.
    far = Note.create!(valid_attrs(latitude: user_lat,
                                   longitude: user_lng + 0.10,
                                   content: "well past"))

    ids = Note.nearby(lat: user_lat, lng: user_lng, radius_m: 5_000).map(&:id)
    assert_not_includes ids, far.id
  end
end
