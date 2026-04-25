require "test_helper"

# Verifies the +/yourself+ profile screen: auth + onboarded gate, identity
# card numbers, the trail (which deliberately includes archived and expired
# notes — it's a personal history, not an active feed), and the sign-out
# affordance.
class YourselfControllerTest < ActionDispatch::IntegrationTest
  test "redirects anonymous visitors to sign-in" do
    get yourself_path
    assert_redirected_to new_session_path
  end

  test "redirects users without onboarded_at to /welcome" do
    sign_in_as(users(:bob))
    get yourself_path
    assert_redirected_to welcome_path
  end

  test "renders the profile shell for an onboarded user" do
    sign_in_as(users(:alice))
    get yourself_path
    assert_response :success

    assert_select "h1", text: I18n.t("yourself.title")
    assert_select "section", text: /#{I18n.t('yourself.sections.languages')}/
    assert_select "section", text: /#{I18n.t('yourself.sections.presence')}/
    assert_select "section", text: /#{I18n.t('yourself.sections.trail')}/
  end

  test "identity card shows the dropped/alive counters" do
    sign_in_as(users(:alice))
    # Alice owns 4 fixtures: 2 active (epsevg_saffron, placa_reial_lampposts),
    # 1 expired (expired_brunch), 1 archived (archived_projector).
    get yourself_path
    assert_response :success

    body = response.body
    assert_includes body, I18n.t("yourself.counter.dropped", count: 4)
    assert_includes body, I18n.t("yourself.counter.alive",   count: 2)
  end

  test "trail includes archived and expired notes alongside live ones" do
    sign_in_as(users(:alice))
    get yourself_path

    %i[epsevg_saffron placa_reial_lampposts expired_brunch archived_projector].each do |fx|
      assert_select "[data-trail-row-id='#{notes(fx).id}']", count: 1
    end
  end

  test "trail is ordered by created_at descending" do
    sign_in_as(users(:alice))
    get yourself_path

    body = response.body
    ordered_ids = users(:alice).notes.order(created_at: :desc).pluck(:id)
    positions = ordered_ids.map { |id| body.index("data-trail-row-id=\"#{id}\"") }
    assert positions.none?(&:nil?), "every alice note must render a trail row"
    assert_equal positions, positions.sort, "trail rows must be ordered by created_at desc"
  end

  test "trail meta-line marks archived notes with the archived label" do
    sign_in_as(users(:alice))
    get yourself_path

    assert_select "[data-trail-row-state='archived']" do
      assert_select "*", text: /#{Regexp.escape(I18n.t('yourself.trail.meta.archived_label'))}/i
    end
  end

  test "trail meta-line marks vanished notes with the vanished_ago copy" do
    sign_in_as(users(:alice))
    get yourself_path

    assert_select "[data-trail-row-state='vanished']" do
      # The exact time string is rate-of-change so we check the prefix.
      assert_select "*", text: /vanished/i
    end
  end

  test "trail shows distance for live notes when viewer coords are present" do
    sign_in_as(users(:alice))
    saffron = notes(:epsevg_saffron)

    get yourself_path(lat: saffron.latitude.to_f, lng: saffron.longitude.to_f)
    assert_response :success

    assert_select "[data-trail-row-id='#{saffron.id}']" do
      assert_select "*", text: /\d+m/
    end
  end

  test "trail omits distance for live notes when viewer coords are missing" do
    sign_in_as(users(:alice))
    get yourself_path

    saffron = notes(:epsevg_saffron)
    assert_select "[data-trail-row-id='#{saffron.id}']" do |row|
      # No "Nm" segment must appear in the row meta.
      assert_no_match(/\d+m\b/, row.to_s.scan(/<[^>]+>([^<]*)<\/[^>]+>/).join(" "))
    end
  end

  test "renders the sign-out form posting DELETE to the session" do
    sign_in_as(users(:alice))
    get yourself_path

    assert_select "form[action=?][method=post]", session_path do
      assert_select "input[name=_method][value=delete]", count: 1
      assert_select "*", text: /#{I18n.t('yourself.sign_out')}/
    end
  end

  test "search radius row is rendered with the SOON badge and disabled" do
    sign_in_as(users(:alice))
    get yourself_path

    assert_select "[data-row='search_radius']" do
      assert_select "*", text: /#{I18n.t('yourself.soon_badge')}/
    end
  end

  test "interface row exposes one chip per available locale" do
    sign_in_as(users(:alice))
    get yourself_path

    I18n.available_locales.each do |loc|
      assert_select "form[action=?]", locale_path(locale: loc.to_s)
    end
  end

  test "empty trail shows the empty-state copy" do
    # Carla has notes too; create a fresh user to test the empty branch.
    user = User.create!(email: "lonely@example.com",
                        password: "secret123",
                        language: "en",
                        onboarded_at: Time.current)
    sign_in_as(user, password: "secret123")
    get yourself_path

    assert_response :success
    assert_select "*", text: /#{Regexp.escape(I18n.t('yourself.trail.empty'))}/
  end
end
