# Sign-in and sign-out flow.
#
# Anonymous visitors can reach +new+ and +create+; +destroy+ requires an
# authenticated session (the default enforced by {Authentication}).
class SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[new create]

  # Render the sign-in form.
  #
  # Already-authenticated visitors are bounced to {#post_authentication_url}
  # instead of seeing the form again.
  #
  # @return [void]
  def new
    redirect_to post_authentication_url if authenticated?
  end

  # Authenticate the +email+/+password+ pair and start a session on success.
  #
  # On success: creates a {Session} via {Authentication#start_new_session_for}
  # and redirects to {Authentication#after_authentication_url}.
  # On failure: re-renders the form with HTTP 422 and a generic alert.
  #
  # @return [void]
  def create
    user = User.find_by(email: params[:email].to_s.strip.downcase)

    if user&.authenticate(params[:password])
      start_new_session_for(user)
      redirect_to after_authentication_url, notice: t("auth.login.success")
    else
      flash.now[:form_alert] = t("auth.login.invalid")
      render :new, status: :unprocessable_entity
    end
  end

  # Sign the current user out and redirect to the sign-in page.
  #
  # @return [void]
  def destroy
    terminate_session
    redirect_to new_session_path, notice: t("auth.logout.success")
  end
end
