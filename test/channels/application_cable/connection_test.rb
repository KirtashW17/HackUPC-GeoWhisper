require "test_helper"

module ApplicationCable
  # Coverage for the WebSocket-level {ApplicationCable::Connection}.
  #
  # No real channels exist yet, so the suite is a placeholder ready to add
  # cookie-based authentication tests when broadcasting goes in.
  class ConnectionTest < ActionCable::Connection::TestCase
    # test "connects with cookies" do
    #   cookies.signed[:user_id] = 42
    #
    #   connect
    #
    #   assert_equal connection.user_id, "42"
    # end
  end
end
