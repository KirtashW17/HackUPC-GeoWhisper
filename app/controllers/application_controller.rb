# Base class for every controller in the app.
#
# Mixes in {Authentication} (so all controllers require sign-in by default)
# and resolves the request locale on every action via {#set_locale}.
class ApplicationController < ActionController::Base
  include Authentication

  # NOTE: `allow_browser versions: :modern` was here. Removed because the
  # Rails 7.2 detection blocks any User-Agent it doesn't recognise (Vivaldi
  # ships its own UA string and isn't in the modern bucket; older Firefox
  # builds also fail). For a hackathon-scope app the guard creates more
  # problems than it solves. Re-evaluate when polishing for production.

  before_action :set_locale

  private

  # Set +I18n.locale+ for the duration of the request.
  #
  # @return [Symbol] the locale that was applied.
  def set_locale
    I18n.locale = pick_locale
  end

  # Resolve which locale should win for the current request.
  #
  # Resolution order (first available match wins):
  #   1. +?locale=+ query param.
  #   2. The signed-in user's +language+ column.
  #   3. The +:locale+ key previously stored in the Rails session
  #      (set by {LocalesController#update} for anonymous visitors).
  #   4. The first two-letter tag of the +Accept-Language+ header.
  #   5. {I18n.default_locale}.
  #
  # @return [Symbol] a locale symbol that is guaranteed to be in
  #   +I18n.available_locales+.
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
