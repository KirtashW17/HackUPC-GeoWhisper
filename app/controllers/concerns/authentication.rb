module Authentication
  extend ActiveSupport::Concern

  SESSION_COOKIE = :session_id

  included do
    before_action :resume_session
    before_action :require_authentication
    helper_method :authenticated?, :current_user
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private

  def authenticated?
    Current.session.present?
  end

  def current_user
    Current.user
  end

  def resume_session
    return if Current.session

    session_id = cookies.signed[SESSION_COOKIE]
    return if session_id.blank?

    Current.session = ::Session.find_by(id: session_id)
  end

  def require_authentication
    return if authenticated?

    request_authentication
  end

  def request_authentication
    session[:return_to_after_authenticating] = request.url if request.get?
    redirect_to new_session_path, alert: t("errors.forbidden")
  end

  def after_authentication_url
    session.delete(:return_to_after_authenticating) || root_url
  end

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

  def terminate_session
    Current.session&.destroy
    cookies.delete(SESSION_COOKIE)
    Current.session = nil
  end
end
