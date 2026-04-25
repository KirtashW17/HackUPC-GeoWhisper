require "test_helper"

# Verifies the post-login routing rules: where each kind of user lands after
# sign-in / sign-up, and the +/welcome+ ↔ +/map+ guards based on
# +onboarded_at+.
class PostLoginDispatchTest < ActionDispatch::IntegrationTest
  # Build a user with a unique email and the requested onboarding state.
  #
  # @param language [String] one of {User::SUPPORTED_LANGUAGES}.
  # @param onboarded [Boolean] when true, sets +onboarded_at+ to now.
  # @return [User] a persisted user.
  def create_user(language:, onboarded:)
    User.create!(
      email: "user-#{SecureRandom.hex(4)}@example.com",
      password: "secret123",
      password_confirmation: "secret123",
      language: language,
      onboarded_at: onboarded ? Time.current : nil
    )
  end

  test "root path renders the login screen for visitors" do
    get root_path
    assert_response :success
    assert_select "form[action='#{session_path}']"
  end

  test "root path redirects authenticated, non-onboarded user to /welcome" do
    user = create_user(language: "en", onboarded: false)
    post session_path, params: { email: user.email, password: "secret123" }

    get root_path
    assert_redirected_to welcome_path
  end

  test "root path redirects authenticated, onboarded user to /map" do
    user = create_user(language: "en", onboarded: true)
    post session_path, params: { email: user.email, password: "secret123" }

    get root_path
    assert_redirected_to map_path
  end

  test "signup redirects to /welcome (new user is not onboarded)" do
    post registration_path, params: {
      user: {
        email: "new@example.com",
        password: "secret123",
        password_confirmation: "secret123"
      }
    }
    assert_redirected_to welcome_path
  end

  test "login redirects to /welcome when user has no onboarded_at" do
    user = create_user(language: "en", onboarded: false)
    post session_path, params: { email: user.email, password: "secret123" }
    assert_redirected_to welcome_path
  end

  test "login redirects to /map when user is onboarded" do
    user = create_user(language: "en", onboarded: true)
    post session_path, params: { email: user.email, password: "secret123" }
    assert_redirected_to map_path
  end

  test "/welcome redirects already-onboarded users to /map" do
    user = create_user(language: "en", onboarded: true)
    post session_path, params: { email: user.email, password: "secret123" }

    get welcome_path
    assert_redirected_to map_path
  end

  test "/map redirects users without onboarded_at to /welcome" do
    user = create_user(language: "en", onboarded: false)
    post session_path, params: { email: user.email, password: "secret123" }

    get map_path
    assert_redirected_to welcome_path
  end

  test "POST /welcome marks the user as onboarded and redirects to /map" do
    user = create_user(language: "en", onboarded: false)
    post session_path, params: { email: user.email, password: "secret123" }

    assert_changes -> { user.reload.onboarded_at } do
      post complete_onboarding_path
    end
    assert_redirected_to map_path
  end

  test "/welcome and /map require authentication" do
    get welcome_path
    assert_redirected_to new_session_path

    get map_path
    assert_redirected_to new_session_path
  end
end
