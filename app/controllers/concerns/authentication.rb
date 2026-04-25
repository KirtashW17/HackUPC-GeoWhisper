# Cookie- and database-backed authentication for controllers.
#
# Mixed into ApplicationController so every controller starts out requiring an
# authenticated session. Individual controllers opt out per-action with
# {ClassMethods#allow_unauthenticated_access}.
#
# The session lifecycle is:
#   1. {#start_new_session_for} creates a Session row and sets a signed,
#      HttpOnly cookie with its id.
#   2. {#resume_session} runs as a +before_action+ on every request, looks up
#      the Session by cookie id, and stashes it in {Current}.
#   3. {#terminate_session} destroys the row and clears the cookie on logout.
module Authentication
  extend ActiveSupport::Concern

  # Name of the signed cookie that carries the current session id.
  SESSION_COOKIE = :session_id

  included do
    before_action :resume_session
    before_action :require_authentication
    helper_method :authenticated?, :current_user
  end

  class_methods do
    # Skip the authentication +before_action+ for the given actions.
    #
    # Thin wrapper around +skip_before_action+ so controllers can express
    # intent at the call site (+allow_unauthenticated_access only: :new+).
    #
    # @param options [Hash] forwarded verbatim to +skip_before_action+ (e.g.
    #   +only:+, +except:+, +if:+).
    # @return [void]
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private

  # Whether the current request carries a resolved session.
  #
  # Exposed as a helper to views via +helper_method+.
  #
  # @return [Boolean] true when {Current.session} is set.
  def authenticated?
    Current.session.present?
  end

  # The user behind the current session, if any.
  #
  # Exposed as a helper to views via +helper_method+.
  #
  # @return [User, nil] the authenticated user, or +nil+ when anonymous.
  def current_user
    Current.user
  end

  # Resolve the session cookie into a {Session} on {Current}.
  #
  # No-op when {Current.session} is already populated (e.g. just signed in
  # within the same request) or when no cookie is present.
  #
  # @return [Session, nil] the resumed session, or +nil+ if none.
  def resume_session
    return if Current.session

    session_id = cookies.signed[SESSION_COOKIE]
    return if session_id.blank?

    Current.session = ::Session.find_by(id: session_id)
  end

  # Halt the request when the visitor is not authenticated.
  #
  # Wired as a +before_action+; delegates to {#request_authentication} which
  # remembers the original URL and redirects to the sign-in page.
  #
  # @return [void]
  def require_authentication
    return if authenticated?

    request_authentication
  end

  # Stash the current GET URL and redirect to the sign-in page.
  #
  # The stashed URL is consumed by {#after_authentication_url} so the user
  # lands back where they were after signing in.
  #
  # @return [void]
  def request_authentication
    session[:return_to_after_authenticating] = request.url if request.get?
    redirect_to new_session_path, alert: t("errors.forbidden")
  end

  # Where to send the user immediately after a successful sign-in.
  #
  # Prefers the URL stashed by {#request_authentication}; falls back to
  # {#post_authentication_url}.
  #
  # @return [String] absolute URL to redirect to.
  def after_authentication_url
    session.delete(:return_to_after_authenticating) || post_authentication_url
  end

  # Default landing URL for an authenticated user with no pending redirect.
  #
  # Routes first-time users through the welcome screen until they have an
  # +onboarded_at+ timestamp, then drops them on the map.
  #
  # @return [String] +welcome_url+ for not-yet-onboarded users, +map_url+ otherwise.
  def post_authentication_url
    return welcome_url unless Current.user&.onboarded_at
    map_url
  end

  # Persist a new session for +user+ and set the signed session cookie.
  #
  # Captures the request IP and User-Agent for audit/debugging. The cookie is
  # +httponly+ and +same_site: :lax+ to mitigate XSS and CSRF.
  #
  # @param user [User] the user being signed in.
  # @return [Session] the newly created session row.
  def start_new_session_for(user)
    user.sessions.create!(
      ip_address: request.remote_ip,
      user_agent: request.user_agent
    ).tap do |new_session|
      Current.session = new_session
      cookies.signed.permanent[SESSION_COOKIE] = {
        value: new_session.id,
        httponly: true,
        same_site: :lax
      }
    end
  end

  # Destroy the current session row, clear the cookie, and reset {Current}.
  #
  # Safe to call when no session is active.
  #
  # @return [void]
  def terminate_session
    Current.session&.destroy
    cookies.delete(SESSION_COOKIE)
    Current.session = nil
  end
end
