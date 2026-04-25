require "test_helper"

class RegistrationsControllerTest < ActionDispatch::IntegrationTest
  test "new is publicly accessible" do
    get new_registration_path
    assert_response :success
  end

  test "create with valid params creates user and signs in" do
    assert_difference("User.count", 1) do
      assert_difference("Session.count", 1) do
        post registration_path, params: {
          user: {
            email: "bob@example.com",
            password: "secret123",
            password_confirmation: "secret123"
          }
        }
      end
    end
    assert_redirected_to root_url
  end

  test "create with mismatched passwords renders errors" do
    assert_no_difference("User.count") do
      post registration_path, params: {
        user: {
          email: "bob@example.com",
          password: "secret123",
          password_confirmation: "nope"
        }
      }
    end
    assert_response :unprocessable_entity
  end

  test "language is auto-set from current locale" do
    post registration_path,
         params: {
           locale: "ca",
           user: {
             email: "carla@example.com",
             password: "secret123",
             password_confirmation: "secret123"
           }
         }
    assert_equal "ca", User.find_by(email: "carla@example.com").language
  end
end
