require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      email: "alice@example.com",
      password: "secret123",
      password_confirmation: "secret123",
      language: "en"
    )
  end

  test "new is publicly accessible" do
    get new_session_path
    assert_response :success
  end

  test "create with valid credentials signs the user in" do
    assert_difference("Session.count", 1) do
      post session_path, params: { email: @user.email, password: "secret123" }
    end
    assert_redirected_to root_url
    follow_redirect!
    assert_response :success
  end

  test "create with invalid credentials shows error" do
    assert_no_difference("Session.count") do
      post session_path, params: { email: @user.email, password: "wrong" }
    end
    assert_response :unprocessable_entity
  end

  test "create with unknown email shows error" do
    post session_path, params: { email: "nobody@example.com", password: "secret123" }
    assert_response :unprocessable_entity
  end

  test "destroy signs the user out" do
    post session_path, params: { email: @user.email, password: "secret123" }
    assert_difference("Session.count", -1) do
      delete session_path
    end
    assert_redirected_to new_session_path
  end
end
