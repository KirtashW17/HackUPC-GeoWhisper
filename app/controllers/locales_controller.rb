# Switch the active UI locale.
#
# Reachable without authentication so the language can be changed from the
# sign-in / sign-up screens. Persists the choice on {Current.user} when one
# exists, otherwise stashes it in the Rails session so the choice survives
# across requests for anonymous visitors.
class LocalesController < ApplicationController
  allow_unauthenticated_access only: :update

  # Apply the requested locale and bounce back to the previous page.
  #
  # Unknown locales (not in +I18n.available_locales+) are silently ignored —
  # the redirect still happens so the URL doesn't dead-end.
  #
  # @return [void]
  def update
    locale = params[:locale].to_s

    if I18n.available_locales.map(&:to_s).include?(locale)
      session[:locale] = locale
      Current.user&.update(language: locale)
    end

    redirect_back_or_to root_path
  end
end
