require "test_helper"

class LocalesControllerTest < ActionDispatch::IntegrationTest
  test "supported locale is stored in session" do
    patch locale_path(locale: "es")
    assert_equal "es", session[:locale]
  end

  test "unsupported locale is ignored" do
    patch locale_path(locale: "xx")
    assert_nil session[:locale]
  end

  test "persists language on the authenticated user" do
    user = User.create!(
      email: "alice@example.com",
      password: "secret123",
      password_confirmation: "secret123",
      language: "en"
    )
    post session_path, params: { email: user.email, password: "secret123" }

    patch locale_path(locale: "ca")

    assert_equal "ca", user.reload.language
  end
end
