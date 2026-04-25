require "test_helper"

# Exercises the full resolution order in {ApplicationController#pick_locale}.
#
# Each test isolates one signal (param, session, Accept-Language header,
# authenticated user's +language+, default) and asserts which one wins.
class LocaleResolutionTest < ActionDispatch::IntegrationTest
  test "default locale when no signal present" do
    get root_path
    assert_equal :en, I18n.locale
  end

  test "param wins over everything" do
    get root_path, params: { locale: "ca" },
        headers: { "HTTP_ACCEPT_LANGUAGE" => "es" }
    assert_equal :ca, I18n.locale
  end

  test "session is used when no param" do
    patch locale_path(locale: "es")
    get root_path
    assert_equal :es, I18n.locale
  end

  test "Accept-Language header is used when no param/session" do
    get root_path, headers: { "HTTP_ACCEPT_LANGUAGE" => "ca-ES,ca;q=0.9" }
    assert_equal :ca, I18n.locale
  end

  test "authenticated user language is used when no param present" do
    user = User.create!(
      email: "alice@example.com",
      password: "secret123",
      password_confirmation: "secret123",
      language: "ca"
    )
    post session_path, params: { email: user.email, password: "secret123" }

    get root_path
    assert_equal :ca, I18n.locale
  end

  test "unsupported locale param falls back to default" do
    get root_path, params: { locale: "xx" }
    assert_equal :en, I18n.locale
  end
end
