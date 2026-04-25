# Whisper / "ghost note" domain — controllers, models, forms, helpers.
module Notes
  # Form object for the compose screen. Validates everything that the
  # future `Note` model will validate plus the UI-specific caps (TTL ≤ 30
  # days, max_views ≤ 1000) that don't belong on the model. See
  # doc/decisions.md → "Notas eternas vía UI: NO".
  #
  # While the real Note model lives on a colleague's branch the form is
  # still useful: `NotesController#create` runs `valid?` and either
  # re-renders or fakes a success. When the model lands, swap the
  # fake-success for `Note.create!(form.to_note_params)`.
  class ComposeForm
    include ActiveModel::Model
    include ActiveModel::Attributes

    # Maximum length of a whisper's body, in characters.
    CONTENT_MAX            = 500
    # UI-side cap on the TTL: 30 days. Enforced here so users can't drop
    # "eternal" notes through the UI even if the model would allow it.
    UI_TTL_MAX_SECONDS     = 30.days.to_i
    # UI-side cap on +max_views+: 1000. See doc/decisions.md.
    UI_MAX_VIEWS_CAP       = 1_000
    # Languages a whisper can be tagged as. Mirrors {User::SUPPORTED_LANGUAGES}.
    SUPPORTED_LANGUAGES    = %w[en es ca].freeze
    # Visibility scopes accepted by the form. Mirrors the future Note enum.
    SUPPORTED_VISIBILITIES = %w[public friends whisper].freeze

    attribute :content, :string
    attribute :latitude, :float
    attribute :longitude, :float
    attribute :ttl_seconds, :integer
    attribute :max_views, :integer
    attribute :language, :string, default: "en"
    attribute :visibility, :string, default: "public"

    validates :content, presence: true, length: { maximum: CONTENT_MAX }
    validates :latitude,  presence: true,
              numericality: { greater_than_or_equal_to: -90, less_than_or_equal_to: 90 }
    validates :longitude, presence: true,
              numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 }
    validates :language, inclusion: { in: SUPPORTED_LANGUAGES }
    validates :visibility, inclusion: { in: SUPPORTED_VISIBILITIES }
    validate  :ttl_within_ui_cap
    validate  :max_views_within_ui_cap

    # Derived `expires_at` from the TTL seconds. Returns nil for permanent
    # notes (ttl_seconds blank or 0).
    #
    # @return [Time, nil]
    def expires_at
      return nil if ttl_seconds.blank? || ttl_seconds.to_i <= 0

      Time.current + ttl_seconds.to_i.seconds
    end

    # Hash matching the future `Note.create!` parameters.
    #
    # @return [Hash{Symbol=>Object}]
    def to_note_params
      {
        content: content,
        latitude: latitude,
        longitude: longitude,
        expires_at: expires_at,
        max_views: max_views.presence,
        language: language,
        visibility: visibility
      }
    end

    private

    # Reject TTLs outside +[60, UI_TTL_MAX_SECONDS]+.
    #
    # Blank values are allowed and mean "permanent until the model lands".
    #
    # @return [void]
    def ttl_within_ui_cap
      return if ttl_seconds.blank?
      return if ttl_seconds.to_i.between?(60, UI_TTL_MAX_SECONDS)

      errors.add(:ttl_seconds, :inclusion)
    end

    # Reject view caps outside +[1, UI_MAX_VIEWS_CAP]+.
    #
    # Blank values are allowed and mean "no view cap".
    #
    # @return [void]
    def max_views_within_ui_cap
      return if max_views.blank?
      return if max_views.to_i.between?(1, UI_MAX_VIEWS_CAP)

      errors.add(:max_views, :inclusion)
    end
  end
end
