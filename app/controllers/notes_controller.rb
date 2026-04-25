# Whisper-related actions: nearby JSON feed for the map, compose form,
# create stub, and detail view.
#
# All actions require an onboarded user except {#nearby}, which is the
# JSON endpoint the map polls and therefore must work for any
# authenticated visitor regardless of onboarding state.
#
# While the real +Note+ ActiveRecord model lives on a colleague's branch
# this controller talks to {Notes::Catalog} (in-memory stub). When the
# model lands the calls swap 1:1 — see TODO markers below.
class NotesController < ApplicationController
  before_action :require_onboarded, except: :nearby

  # JSON list of active notes around a coordinate, per the contract in
  # doc/plans/phase_2_map_and_compose.md. Reads from {Notes::Catalog}
  # while the real Note model is on a colleague's branch.
  #
  # Renders +422 Unprocessable Entity+ when +lat+/+lng+ are missing or
  # outside their valid WGS84 ranges. +radius+ defaults to 1000 m and is
  # clamped by {Notes::Catalog::MAX_RADIUS_M}.
  #
  # TODO[phase-1-merge]: replace +Notes::Catalog.nearby+ with
  # +Note.active.nearby+ once the Note model lands.
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
    notes  = Notes::Catalog.nearby(lat: lat, lng: lng, radius_m: radius)

    render json: { notes: notes.map(&:as_json_payload) }
  end

  # Render the compose form. The form object ({Notes::ComposeForm})
  # covers validation; the view at +notes/new.html.erb+ renders the
  # design system's compose UI. Defaults the whisper language to the
  # current request locale.
  #
  # @return [void]
  def new
    @form = Notes::ComposeForm.new(language: I18n.locale.to_s)
  end

  # Compose submit — STUBBED.
  #
  # On valid input redirects to the map with a success flash; on
  # invalid input re-renders {#new} with HTTP 422 and the inline field
  # errors.
  #
  # TODO[phase-1-merge]: when the Note model lands in main, replace the
  # fake-success branch with +Note.create!(@form.to_note_params)+ plus
  # proper handling of +ActiveRecord::RecordInvalid+.
  #
  # @return [void]
  def create
    @form = Notes::ComposeForm.new(compose_params)

    if @form.valid?
      redirect_to map_path, notice: t("compose.success_stub")
    else
      render :new, status: :unprocessable_entity
    end
  end

  # Detail view for a single whisper. Responds with +404 Not Found+ when
  # no note matches the requested id. Calls +view!+ on the note (no-op
  # for the stub; will increment +views_count+ once the real model lands).
  #
  # @return [void]
  def show
    @note = Notes::Catalog.find(params[:id])
    return head :not_found unless @note

    @note.view!
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
