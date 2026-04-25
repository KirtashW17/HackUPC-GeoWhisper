class Note < ApplicationRecord
  belongs_to :user

  enum :visibility, { public_note: 0, private_note: 1, friends_only: 2 }

  validates :latitude, presence: true, numericality: { greater_than_or_equal_to: -90, less_than_or_equal_to: 90 }
  validates :longitude, presence: true, numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 }
  validates :max_views, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validates :content, length: { in: 1..500 }, presence: true
  validates :expires_at, numericality: { greater_than_or_equal_to: ->(note) { note.created_at || DateTime.current } }, allow_nil: true

  scope :active, -> { where('expires_at IS NULL OR expires_at > ?', DateTime.current).where('max_views IS NULL OR views_count < max_views') }

  def view!
    return if private_note?
    self.views_count += 1
    if max_views.present? && self.views_count >= max_views
      self.archived = true
    end
    save!
  end
end
