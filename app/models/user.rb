class User < ApplicationRecord
  SUPPORTED_LANGUAGES = %w[en es ca].freeze

  has_secure_password
  has_many :sessions, dependent: :destroy

  normalizes :email, with: ->(value) { value.to_s.strip.downcase }

  validates :email, presence: true, uniqueness: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :language, presence: true, inclusion: { in: SUPPORTED_LANGUAGES }
end
