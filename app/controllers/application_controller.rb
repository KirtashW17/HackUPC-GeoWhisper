class ApplicationController < ActionController::Base
  include Authentication

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  before_action :set_locale

  private

  def set_locale
    I18n.locale = pick_locale
  end

  def pick_locale
    requested = params[:locale].presence&.to_sym
    return requested if I18n.available_locales.include?(requested)

    user_locale = Current.user&.language&.to_sym
    return user_locale if I18n.available_locales.include?(user_locale)

    session_locale = session[:locale]&.to_sym
    return session_locale if I18n.available_locales.include?(session_locale)

    header_locale = request.env["HTTP_ACCEPT_LANGUAGE"]
      &.scan(/^[a-z]{2}/)&.first&.to_sym
    return header_locale if I18n.available_locales.include?(header_locale)

    I18n.default_locale
  end
end
