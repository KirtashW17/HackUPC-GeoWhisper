# Profile screen — third tab of the bottom bar. Renders an identity card,
# language / presence settings, and the personal trail of every whisper the
# current user has dropped (alive, archived, or vanished).
#
# The trail is intentionally a complete history: archived and expired notes
# remain visible so the user can audit their own activity. Only the "alive"
# counter on the identity card uses {Note.active}; the trail itself uses
# the unscoped +current_user.notes+ relation.
class YourselfController < ApplicationController
  before_action :require_onboarded

  # Render the profile.
  #
  # Optional +lat+ / +lng+ query params (passed e.g. by the tab bar when the
  # browser knows the user's position) are used to display the distance to
  # each live whisper in the trail. They are silently ignored when missing
  # or out of range; the trail simply omits the distance segment.
  #
  # @return [void]
  def show
    @user          = Current.user
    @notes_dropped = @user.notes.count
    @notes_alive   = @user.notes.active.count
    @trail         = @user.notes.order(created_at: :desc).limit(50)
    @viewer_lat    = numeric_param(:lat, range: -90.0..90.0)
    @viewer_lng    = numeric_param(:lng, range: -180.0..180.0)
  end

  private

  # Reads a numeric param and validates it's within an allowed range.
  #
  # Mirrors the helper used by {NotesController}; kept duplicated for the
  # hackathon scope rather than extracted into a concern.
  #
  # @param key [Symbol] params key.
  # @param range [Range<Float>] inclusive range of acceptable values.
  # @return [Float, nil] the parsed value, or +nil+ when missing/invalid.
  def numeric_param(key, range:)
    raw = params[key]
    return nil if raw.blank?

    value = Float(raw, exception: false)
    return nil if value.nil?
    return nil unless range.cover?(value)

    value
  end

  # Bounce non-onboarded users to the welcome screen.
  #
  # @return [void]
  def require_onboarded
    redirect_to welcome_path unless Current.user&.onboarded_at
  end
end
