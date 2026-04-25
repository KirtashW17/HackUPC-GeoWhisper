# A persisted authentication session for a {User}.
#
# One row per signed-in browser. Created by
# {Authentication#start_new_session_for} and looked up on every request via
# the signed +:session_id+ cookie. Carries +ip_address+ and +user_agent+ for
# audit / debugging.
class Session < ApplicationRecord
  belongs_to :user
end
