module ApplicationCable
  # Action Cable connection — the WebSocket-level entry point.
  #
  # Override +connect+ here to authenticate the socket against the same
  # session cookie used by HTTP controllers.
  class Connection < ActionCable::Connection::Base
  end
end
