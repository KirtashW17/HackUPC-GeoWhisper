require "test_helper"

# End-to-end coverage for {NotesController}: nearby JSON feed, compose
# form, stubbed create, and detail view.
class NotesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      email: "alice@example.com",
      password: "secret123",
      password_confirmation: "secret123",
      language: "en",
      onboarded_at: Time.current
    )
    post session_path, params: { email: @user.email, password: "secret123" }
  end

  # ── #nearby ────────────────────────────────────────────────────

  test "nearby requires authentication" do
    delete session_path
    get nearby_notes_path(format: :json), params: { lat: 41.2236, lng: 1.7280 }
    assert_redirected_to new_session_path
  end

  test "nearby returns active notes around the given coordinate" do
    get nearby_notes_path(format: :json), params: { lat: 41.2236, lng: 1.7280, radius: 1000 }
    assert_response :success

    body = JSON.parse(response.body)
    assert body.key?("notes")
    assert_predicate body["notes"].size, :positive?
  end

  test "nearby payload contains exactly the contract keys" do
    get nearby_notes_path(format: :json), params: { lat: 41.2236, lng: 1.7280, radius: 5000 }
    body = JSON.parse(response.body)
    note = body["notes"].first

    assert_equal %w[content distance_m id language latitude longitude
                    time_left_seconds views_remaining].sort,
                 note.keys.sort
  end

  test "nearby preserves nil for permanent notes (time_left_seconds)" do
    get nearby_notes_path(format: :json), params: { lat: 41.2236, lng: 1.7280, radius: 5000 }
    body = JSON.parse(response.body)
    permanent = body["notes"].find { |n| n["time_left_seconds"].nil? }

    assert permanent, "expected at least one permanent note in fixture data"
  end

  test "nearby preserves nil for unlimited-view notes (views_remaining)" do
    get nearby_notes_path(format: :json),
        params: { lat: 41.3892, lng: 2.1133, radius: 5000 }
    body = JSON.parse(response.body)
    unlimited = body["notes"].find { |n| n["views_remaining"].nil? }

    assert unlimited, "expected at least one unlimited-view note in fixture data"
  end

  test "nearby excludes expired and over-viewed notes" do
    get nearby_notes_path(format: :json), params: { lat: 41.2236, lng: 1.7280, radius: 5000 }
    ids = JSON.parse(response.body)["notes"].map { |n| n["id"] }

    assert_not_includes ids, 5, "expired note (id 5) should be filtered out"
    assert_not_includes ids, 6, "over-viewed note (id 6) should be filtered out"
  end

  test "nearby orders notes by ascending distance" do
    get nearby_notes_path(format: :json), params: { lat: 41.2236, lng: 1.7280, radius: 5000 }
    distances = JSON.parse(response.body)["notes"].map { |n| n["distance_m"] }
    assert_equal distances.sort, distances
  end

  test "nearby caps the radius at 5000m" do
    get nearby_notes_path(format: :json),
        params: { lat: 41.2236, lng: 1.7280, radius: 1_000_000 }
    far_ids = JSON.parse(response.body)["notes"].map { |n| n["id"] }

    get nearby_notes_path(format: :json),
        params: { lat: 41.2236, lng: 1.7280, radius: 5_000 }
    capped_ids = JSON.parse(response.body)["notes"].map { |n| n["id"] }

    assert_equal capped_ids, far_ids
  end

  test "nearby returns 422 when lat is missing" do
    get nearby_notes_path(format: :json), params: { lng: 1.7280 }
    assert_response :unprocessable_entity
    assert_match(/lat/i, JSON.parse(response.body)["error"])
  end

  test "nearby returns 422 when lng is missing" do
    get nearby_notes_path(format: :json), params: { lat: 41.2236 }
    assert_response :unprocessable_entity
  end

  test "nearby returns 422 when lat is non-numeric" do
    get nearby_notes_path(format: :json), params: { lat: "abc", lng: 1.7280 }
    assert_response :unprocessable_entity
  end

  test "nearby returns 422 when lat is out of range" do
    get nearby_notes_path(format: :json), params: { lat: 200, lng: 1.7280 }
    assert_response :unprocessable_entity
  end

  test "nearby uses default radius when not provided" do
    get nearby_notes_path(format: :json), params: { lat: 41.2236, lng: 1.7280 }
    assert_response :success
  end

  # ── #new ──────────────────────────────────────────────────────

  test "new requires authentication" do
    delete session_path
    get new_note_path
    assert_redirected_to new_session_path
  end

  test "new redirects users without onboarded_at to /welcome" do
    @user.update!(onboarded_at: nil)
    get new_note_path
    assert_redirected_to welcome_path
  end

  test "new renders the compose form" do
    get new_note_path
    assert_response :success
    assert_select "form[action='#{notes_path}']"
  end

  # ── #create ───────────────────────────────────────────────────

  test "create with valid params returns a stubbed success and redirects to /map" do
    post notes_path, params: {
      compose_form: {
        content: "First whisper from the test suite.",
        latitude: 41.2236,
        longitude: 1.7280,
        ttl_seconds: 1.hour.to_i,
        max_views: 5,
        language: "en",
        visibility: "public"
      }
    }
    assert_redirected_to map_path
    assert_match(/whisper/i, flash[:notice])
  end

  test "create with invalid params re-renders the form with 422" do
    post notes_path, params: {
      compose_form: {
        content: "",
        latitude: 41.2236,
        longitude: 1.7280
      }
    }
    assert_response :unprocessable_entity
  end

  test "create rejects out-of-range coordinates" do
    post notes_path, params: {
      compose_form: {
        content: "Hello",
        latitude: 999,
        longitude: 1.7280,
        ttl_seconds: 1.hour.to_i,
        max_views: 5
      }
    }
    assert_response :unprocessable_entity
  end

  # ── #show ─────────────────────────────────────────────────────

  test "show renders an existing note" do
    get note_path(1)
    assert_response :success
  end

  test "show returns 404 for an unknown note id" do
    get note_path(99_999)
    assert_response :not_found
  end

  test "show requires authentication" do
    delete session_path
    get note_path(1)
    assert_redirected_to new_session_path
  end
end
