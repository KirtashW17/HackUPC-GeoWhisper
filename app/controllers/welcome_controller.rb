# Onboarding splash shown to brand-new users right after sign-up.
#
# Users who have already completed onboarding (i.e. carry an +onboarded_at+
# timestamp) are redirected straight to the map.
class WelcomeController < ApplicationController
  # Render the welcome screen, or skip past it for already-onboarded users.
  #
  # @return [void]
  def show
    redirect_to map_path and return if Current.user.onboarded_at
  end

  # Mark the current user as onboarded and send them to the map.
  #
  # @return [void]
  def complete
    Current.user.update!(onboarded_at: Time.current)
    redirect_to map_path
  end
end
