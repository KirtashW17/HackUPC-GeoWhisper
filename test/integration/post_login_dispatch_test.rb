require "test_helper"

# Verifies the post-login routing rules: where each kind of user lands after
# sign-in / sign-up, and the +/welcome+ ↔ +/map+ guards based on
# +onboarded_at+.
class PostLoginDispatchTest < ActionDispatch::IntegrationTest
  test "root path renders the login screen for visitors" do
    get root_path
    assert_response :success
    assert_select "form[action='#{session_path}']"
  end

  test "root path redirects authenticated, non-onboarded user to /welcome" do
    sign_in_as(users(:bob))

    get root_path
    assert_redirected_to welcome_path
  end

  test "root path redirects authenticated, onboarded user to /map" do
    sign_in_as(users(:alice))

    get root_path
    assert_redirected_to map_path
  end

  test "signup redirects to /welcome (new user is not onboarded)" do
    post registration_path, params: {
      user: {
        email: "new@example.com",
        password: FIXTURE_PASSWORD,
        password_confirmation: FIXTURE_PASSWORD
      }
    }
    assert_redirected_to welcome_path
  end

  test "login redirects to /welcome when user has no onboarded_at" do
    sign_in_as(users(:bob))
    assert_redirected_to welcome_path
  end

  test "login redirects to /map when user is onboarded" do
    sign_in_as(users(:alice))
    assert_redirected_to map_path
  end

  test "/welcome redirects already-onboarded users to /map" do
    sign_in_as(users(:alice))

    get welcome_path
    assert_redirected_to map_path
  end

  test "/map redirects users without onboarded_at to /welcome" do
    sign_in_as(users(:bob))

    get map_path
    assert_redirected_to welcome_path
  end

  test "POST /welcome marks the user as onboarded and redirects to /map" do
    user = users(:bob)
    sign_in_as(user)

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
