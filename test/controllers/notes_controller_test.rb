require "test_helper"

# End-to-end coverage for {NotesController}: nearby JSON feed, compose
# form, stubbed create, and detail view.
class NotesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:alice)
    sign_in_as(@user)
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
                    seconds_since_publication views_count max_views].sort,
                 note.keys.sort
  end

  test "nearby exposes seconds_since_publication as a non-negative integer" do
    get nearby_notes_path(format: :json), params: { lat: 41.2236, lng: 1.7280, radius: 5000 }
    body = JSON.parse(response.body)
    note = body["notes"].first

    assert_kind_of Integer, note["seconds_since_publication"]
    assert_operator note["seconds_since_publication"], :>=, 0
  end

  test "nearby preserves nil max_views for unlimited-view notes" do
    get nearby_notes_path(format: :json),
        params: { lat: 41.3892, lng: 2.1133, radius: 5000 }
    body = JSON.parse(response.body)
    unlimited = body["notes"].find { |n| n["max_views"].nil? }

    assert unlimited, "expected at least one unlimited-view note in fixture data"
  end

  test "nearby excludes expired and over-viewed notes" do
    get nearby_notes_path(format: :json), params: { lat: 41.2236, lng: 1.7280, radius: 5000 }
    ids = JSON.parse(response.body)["notes"].map { |n| n["id"] }

    assert_not_includes ids, notes(:expired_brunch).id,
                        "expired note should be filtered out"
    assert_not_includes ids, notes(:archived_projector).id,
                        "over-viewed/archived note should be filtered out"
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

  test "new does not render the bottom tab bar" do
    get new_note_path
    assert_select "nav[aria-label*=?]", I18n.t("nav.drop"), false,
      "compose screen must not show the bottom tab bar"
  end

  test "new exposes a back link to the map" do
    get new_note_path
    assert_select "a[href=?][aria-label=?]", map_path, I18n.t("compose.back")
  end

  test "new shows a location chip" do
    get new_note_path
    assert_select "[data-compose-location]"
  end

  test "new renders max_views as a range slider wired to range_readout" do
    get new_note_path
    assert_select "input[type=range][name='compose_form[max_views]']"
    assert_select "[data-controller~=range-readout]" do
      assert_select "[data-range-readout-target=readout]"
    end
  end

  test "new renders visibility as icon buttons with friends and one-person disabled" do
    get new_note_path
    assert_select "[data-compose-visibility]" do
      assert_select "input[type=radio][name='compose_form[visibility]'][value=public_note]"
      assert_select "[aria-disabled=true]", count: 2
    end
  end

  # ── #create ───────────────────────────────────────────────────

  test "create with valid params persists a note and redirects to /map" do
    assert_difference -> { Note.count }, 1 do
      post notes_path, params: {
        compose_form: {
          content: "First whisper from the test suite.",
          latitude: 41.2236,
          longitude: 1.7280,
          ttl_seconds: 1.hour.to_i,
          max_views: 5,
          language: "en",
          visibility: "public_note"
        }
      }
    end
    assert_redirected_to map_path
    assert_match(/whisper/i, flash[:notice])

    note = Note.last
    assert_equal @user, note.user
    assert_equal "First whisper from the test suite.", note.content
    assert note.public_note?
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
    get note_path(notes(:campus_nord_vending))
    assert_response :success
  end

  test "show returns 404 for an unknown note id" do
    get note_path(99_999)
    assert_response :not_found
  end

  test "show returns 404 for an inactive (expired) note when caller is not the author" do
    # expired_brunch is alice's; sign in as a different user so the
    # owner-trail exception does not apply.
    sign_in_as(users(:carla))
    get note_path(notes(:expired_brunch))
    assert_response :not_found
  end

  test "show requires authentication" do
    delete session_path
    get note_path(notes(:campus_nord_vending))
    assert_redirected_to new_session_path
  end

  test "show calls view! on the note (increments views_count)" do
    # Use a note owned by someone else; authors viewing their own whisper
    # do not consume the read budget (see Note#view!).
    note = notes(:campus_nord_vending) # carla's
    assert_difference -> { note.reload.views_count }, 1 do
      get note_path(note)
    end
  end

  test "show does not increment views_count when the owner reads their own note" do
    own = notes(:placa_reial_lampposts) # alice's
    assert_no_difference -> { own.reload.views_count } do
      get note_path(own)
    end
  end

  test "show does not archive the owner's last-view note" do
    own = notes(:placa_reial_lampposts) # alice's
    own.update!(max_views: 1, views_count: 0)

    get note_path(own)
    assert_response :success

    own.reload
    assert_equal 0, own.views_count
    assert_not own.archived?
  end

  test "show does not render the bottom tab bar" do
    get note_path(notes(:campus_nord_vending))
    assert_select "nav[aria-label*=?]", I18n.t("nav.drop"), false,
      "detail screen must not show the bottom tab bar"
  end

  test "show renders a back link to the map (square icon button, no text)" do
    get note_path(notes(:campus_nord_vending))
    assert_select "a[href=?][aria-label=?]", map_path, I18n.t("detail.back") do
      assert_select "svg"
    end
  end

  test "show renders a disabled report button" do
    get note_path(notes(:campus_nord_vending))
    assert_select "button[disabled]", text: /#{I18n.t('detail.report')}/i
  end

  test "show renders a disabled whisper-back button" do
    get note_path(notes(:campus_nord_vending))
    assert_select "button[disabled]", text: /#{I18n.t('detail.whisper_back')}/i
  end

  test "show renders the 'left X ago' eyebrow" do
    get note_path(notes(:campus_nord_vending))
    assert_match(/left .* ago/i, response.body)
  end

  test "show renders distance when viewer coordinates are provided" do
    note = notes(:campus_nord_vending)
    get note_path(note, lat: note.latitude.to_f + 0.001, lng: note.longitude.to_f)
    assert_match(/m\b/i, response.body)
    assert_select "span", /away|a \d+m/i
  end

  test "show omits distance when viewer coordinates are not provided" do
    get note_path(notes(:campus_nord_vending))
    # Eyebrow text exists but should not include the distance fragment.
    assert_no_match(/away|a \d+m/i, css_select(".text-accent").to_s)
  end

  test "show renders the reads-left progress bar for capped notes" do
    get note_path(notes(:placa_reial_lampposts))
    # Both lifecycle bars present: fades_in + reads_left.
    assert_select ".bg-bg-deep .bg-accent", minimum: 2
  end

  test "show renders an archive button on the user's own note" do
    own = notes(:placa_reial_lampposts) # alice's
    get note_path(own)
    assert_select "form[action=?][method=post]", note_path(own) do
      assert_select "input[name=_method][value=delete]", true
      assert_select "button", text: /#{I18n.t('detail.archive.cta')}/i
    end
  end

  test "show does not render an archive button on someone else's note" do
    other = notes(:campus_nord_vending) # carla's
    get note_path(other)
    assert_select "button", text: /#{I18n.t('detail.archive.cta')}/i, count: 0
  end

  test "show replaces the report button with archive on the user's own note" do
    own = notes(:placa_reial_lampposts) # alice's
    get note_path(own)
    assert_select "button[disabled]", text: /#{I18n.t('detail.report')}/i, count: 0
  end

  # ── #destroy (manual archive) ─────────────────────────────────

  test "destroy archives the user's own note and redirects to /map with flash" do
    own = notes(:placa_reial_lampposts) # alice's
    delete note_path(own)
    assert_redirected_to map_path
    assert_match(/archiv/i, flash[:notice])
    assert own.reload.archived?
  end

  test "destroy returns 404 for a note owned by someone else" do
    other = notes(:campus_nord_vending) # carla's
    delete note_path(other)
    assert_response :not_found
    assert_not other.reload.archived?
  end

  test "destroy returns 404 for a non-existent id" do
    delete note_path(99_999)
    assert_response :not_found
  end

  test "destroy requires authentication" do
    own = notes(:placa_reial_lampposts)
    delete session_path
    delete note_path(own)
    assert_redirected_to new_session_path
    assert_not own.reload.archived?
  end

  test "destroy redirects users without onboarded_at to /welcome" do
    own = notes(:placa_reial_lampposts)
    @user.update!(onboarded_at: nil)
    delete note_path(own)
    assert_redirected_to welcome_path
    assert_not own.reload.archived?
  end

  test "archived notes do not appear in nearby" do
    archived = notes(:archived_projector) # alice's, archived: true, no view-cap reason to exclude
    get nearby_notes_path(format: :json),
        params: { lat: archived.latitude.to_f, lng: archived.longitude.to_f, radius: 5_000 }
    ids = JSON.parse(response.body)["notes"].map { |n| n["id"] }
    assert_not_includes ids, archived.id
  end

  test "archived notes return 404 on show for non-authors" do
    # archived_projector is alice's; the owner-trail exception means alice
    # can still read it. Anyone else gets 404.
    sign_in_as(users(:carla))
    archived = notes(:archived_projector)
    get note_path(archived)
    assert_response :not_found
  end

  # ── Owner trail access to inactive notes ──────────────────────

  test "show lets the author read their own archived note from the trail" do
    archived = notes(:archived_projector) # alice's
    get note_path(archived)
    assert_response :success
    assert_select "[data-note-status=archived]"
    assert_select ".text-accent", text: /#{I18n.t('detail.status.archived')}/i
  end

  test "show lets the author read their own expired note from the trail" do
    expired = notes(:expired_brunch) # alice's, expires_at in the past
    get note_path(expired)
    assert_response :success
    assert_select "[data-note-status=expired]"
  end

  test "show does not increment views_count when the owner reads an inactive note" do
    archived = notes(:archived_projector)
    assert_no_difference -> { archived.reload.views_count } do
      get note_path(archived)
    end
  end

  test "show does not render the archive button on an already-inactive own note" do
    archived = notes(:archived_projector) # alice's
    get note_path(archived)
    assert_response :success
    # No POST form to /notes/:id (the archive submit) on an already
    # archived note — owners must not be able to "re-archive".
    assert_select "form[action=?][method=post]", note_path(archived), count: 0
    assert_select "button[disabled]", text: /#{I18n.t('detail.status.locked')}/i
  end
end
