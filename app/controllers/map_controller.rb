# Main map screen — entry point for authenticated, onboarded users.
class MapController < ApplicationController
  # Render the map, redirecting brand-new users to onboarding first.
  #
  # @return [void]
  def show
    redirect_to welcome_path and return unless Current.user.onboarded_at
  end
end
