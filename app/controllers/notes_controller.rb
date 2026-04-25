# Whisper-related actions: nearby JSON feed for the map, compose form,
# create, and detail view.
#
# All actions require an onboarded user except {#nearby}, which is the
# JSON endpoint the map polls and therefore must work for any authenticated
# visitor regardless of onboarding state.
class NotesController < ApplicationController
  before_action :require_onboarded, except: :nearby

  # JSON list of active notes around a coordinate, per the contract in
  # +doc/plans/phase_2_map_and_compose.md+.
  #
  # Renders +422 Unprocessable Entity+ when +lat+/+lng+ are missing or
  # outside their valid WGS84 ranges. +radius+ defaults to 1000 m and is
  # clamped server-side by {Note::MAX_RADIUS_M}.
  #
  # @return [void]
  def nearby
    lat = numeric_param(:lat, range: -90.0..90.0)
    lng = numeric_param(:lng, range: -180.0..180.0)

    if lat.nil? || lng.nil?
      render json: { error: "lat and lng are required and must be valid coordinates" },
             status: :unprocessable_entity
      return
    end

    radius = (params[:radius].presence || 1_000).to_i
    notes  = Note.nearby(lat: lat, lng: lng, radius_m: radius)

    render json: { notes: notes.map(&:as_json_payload) }
  end

  # Render the compose form. Defaults the whisper language to the current
  # request locale.
  #
  # @return [void]
  def new
    @form = Notes::ComposeForm.new(language: I18n.locale.to_s)
  end

  # Persist a new whisper authored by the current user.
  #
  # On valid input creates the {Note} and redirects to +/map+. On invalid
  # input (form-level or AR-level) re-renders {#new} with HTTP 422 and the
  # inline field errors.
  #
  # @return [void]
  def create
    @form = Notes::ComposeForm.new(compose_params)

    if @form.valid?
      Note.create!(@form.to_note_params.merge(user: Current.user))
      redirect_to map_path, notice: t("compose.success")
    else
      render :new, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordInvalid => e
    e.record.errors.each { |error| @form.errors.add(error.attribute, error.message) }
    render :new, status: :unprocessable_entity
  end

  # Detail view for a single whisper.
  #
  # Visibility rules:
  # * Active notes are visible to anyone authenticated.
  # * Inactive notes (manually archived or beyond their time/views budget)
  #   are visible only to their author — accessed from the personal trail
  #   on +/yourself+. Everybody else gets +404+ so the existence of the
  #   note isn't leaked.
  #
  # +view!+ is only called on active notes; reading a vanished note from
  # the trail must not bump counters or trigger archival side-effects.
  # Owner reads are also a no-op inside +view!+ (see {Note#view!}).
  #
  # @return [void]
  def show
    @note = Note.find_by(id: params[:id])
    return head :not_found unless @note
    return head :not_found if @note.inactive? && @note.user_id != Current.user&.id

    @note.view!(viewer: Current.user) unless @note.inactive?

    lat = numeric_param(:lat, range: -90.0..90.0)
    lng = numeric_param(:lng, range: -180.0..180.0)
    @note.distance_m = @note.distance_to_m(lat, lng) if lat && lng
  end

  # Soft-delete a whisper: marks it archived so it disappears from the
  # nearby feed and from its own detail page. Only the note's author can
  # archive it; any other caller sees +404 Not Found+ (no information
  # leaked about the note's existence).
  #
  # @return [void]
  def destroy
    @note = Note.find_by(id: params[:id], user: Current.user)
    return head :not_found unless @note

    @note.archive!
    redirect_to map_path, notice: t("detail.archive.success")
  end

  private

  # Reads a numeric param and validates it's within an allowed range.
  #
  # @param key [Symbol] params key.
  # @param range [Range] inclusive range of acceptable values.
  # @return [Float, nil] the float value, or nil when missing/invalid.
  def numeric_param(key, range:)
    raw = params[key]
    return nil if raw.blank?

    value = Float(raw, exception: false)
    return nil if value.nil?
    return nil unless range.cover?(value)

    value
  end

  # Strong-params filter for the compose form.
  #
  # @return [ActionController::Parameters] permitted +:compose_form+ subset.
  def compose_params
    params.require(:compose_form).permit(:content, :latitude, :longitude,
                                         :ttl_seconds, :max_views,
                                         :language, :visibility)
  end

  # Bounce non-onboarded users to the welcome screen.
  #
  # Wired as a +before_action+ for every action except {#nearby}.
  #
  # @return [void]
  def require_onboarded
    redirect_to welcome_path unless Current.user&.onboarded_at
  end
end
