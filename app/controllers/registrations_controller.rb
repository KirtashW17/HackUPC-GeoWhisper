# Sign-up flow: create a {User} and start a session in one step.
class RegistrationsController < ApplicationController
  allow_unauthenticated_access only: %i[new create]

  # Render the sign-up form with an empty {User}.
  #
  # @return [void]
  def new
    @user = User.new
  end

  # Persist a new {User} and sign them in on success.
  #
  # The current request locale is stored on the user as +language+ so future
  # sessions default to it. On validation failure the form is re-rendered
  # with HTTP 422 and the inline field errors.
  #
  # @return [void]
  def create
    @user = User.new(user_params.merge(language: I18n.locale.to_s))

    if @user.save
      start_new_session_for(@user)
      redirect_to after_authentication_url, notice: t("auth.signup.success")
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  # Strong-params filter for {#create}.
  #
  # @return [ActionController::Parameters] permitted +:user+ subset.
  def user_params
    params.require(:user).permit(:email, :password, :password_confirmation)
  end
end
