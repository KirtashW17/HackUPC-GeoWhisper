class LocalesController < ApplicationController
  allow_unauthenticated_access only: :update

  def update
    locale = params[:locale].to_s

    if I18n.available_locales.map(&:to_s).include?(locale)
      session[:locale] = locale
      Current.user&.update(language: locale)
    end

    redirect_back_or_to root_path
  end
end
