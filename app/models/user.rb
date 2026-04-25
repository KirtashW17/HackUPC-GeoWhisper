# An account that can sign in and (eventually) drop and read whispers.
#
# Authentication is handled by Rails' +has_secure_password+: the +password+
# and +password_confirmation+ virtual attributes are written to a bcrypt
# +password_digest+ column on save.
#
# Each user has many {Session}s; deleting the user cascades and destroys
# them all so cookies issued to that account stop being valid.
class User < ApplicationRecord
  # ISO 639-1 language tags the UI is currently localized for. Must stay
  # in sync with +config/locales/*.yml+.
  SUPPORTED_LANGUAGES = %w[en es ca].freeze

  has_secure_password
  has_many :sessions, dependent: :destroy
  # Or maybe we should keep them as "anonymous" notes?
  has_many :notes, dependent: :destroy

  normalizes :email, with: ->(value) { value.to_s.strip.downcase }

  validates :email, presence: true, uniqueness: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :language, presence: true, inclusion: { in: SUPPORTED_LANGUAGES }
end
