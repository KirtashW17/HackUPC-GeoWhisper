class WelcomeController < ApplicationController
  def show
    redirect_to map_path and return if Current.user.onboarded_at
  end

  def complete
    Current.user.update!(onboarded_at: Time.current)
    redirect_to map_path
  end
end
