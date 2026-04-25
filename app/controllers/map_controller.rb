class MapController < ApplicationController
  def show
    redirect_to welcome_path and return unless Current.user.onboarded_at
  end
end
