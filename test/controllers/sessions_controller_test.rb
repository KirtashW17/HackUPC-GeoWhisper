require "test_helper"

# End-to-end coverage for {SessionsController} (sign-in / sign-out).
class SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:bob)
  end

  test "new is publicly accessible" do
    get new_session_path
    assert_response :success
  end

  test "create with valid credentials signs the user in" do
    assert_difference("Session.count", 1) do
      sign_in_as(@user)
    end
    assert_redirected_to welcome_url
    follow_redirect!
    assert_response :success
  end

  test "create with invalid credentials shows error" do
    assert_no_difference("Session.count") do
      sign_in_as(@user, password: "wrong")
    end
    assert_response :unprocessable_entity
  end

  test "create with unknown email shows error" do
    post session_path, params: { email: "nobody@example.com", password: FIXTURE_PASSWORD }
    assert_response :unprocessable_entity
  end

  test "destroy signs the user out" do
    sign_in_as(@user)
    assert_difference("Session.count", -1) do
      delete session_path
    end
    assert_redirected_to new_session_path
  end
end
