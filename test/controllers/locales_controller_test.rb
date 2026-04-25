require "test_helper"

# Coverage for {LocalesController} — anonymous + authenticated locale switch.
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
    user = users(:alice)
    sign_in_as(user)

    patch locale_path(locale: "ca")

    assert_equal "ca", user.reload.language
  end
end
