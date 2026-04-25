# Per-request global for the active {Session} and its {User}.
#
# Backed by +ActiveSupport::CurrentAttributes+, which scopes the values to
# the current thread/fiber and clears them automatically between requests.
# Use this instead of passing the session/user through every method, but do
# not assign to it from background jobs (it would leak across workers).
#
# @!attribute [rw] session
#   @return [Session, nil] the active session, or +nil+ for anonymous traffic.
# @!method user
#   Convenience accessor for +session.user+.
#   @return [User, nil] the user behind the active session, or +nil+.
class Current < ActiveSupport::CurrentAttributes
  attribute :session
  delegate :user, to: :session, allow_nil: true
end
