class SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[new create]

  def new
    redirect_to post_authentication_url if authenticated?
  end

  def create
    user = User.find_by(email: params[:email].to_s.strip.downcase)

    if user&.authenticate(params[:password])
      start_new_session_for(user)
      redirect_to after_authentication_url, notice: t("auth.login.success")
    else
      flash.now[:alert] = t("auth.login.invalid")
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    terminate_session
    redirect_to new_session_path, notice: t("auth.logout.success")
  end
end
