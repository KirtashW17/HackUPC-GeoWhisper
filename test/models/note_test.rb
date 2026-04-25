require "test_helper"

class NoteTest < ActiveSupport::TestCase
  def setup
    @user = users(:alice)
  end

  def valid_attrs(overrides = {})
    {
      user: @user,
      content: "This is a note.",
      latitude: 41.3874,
      longitude: 2.1686
    }.merge(overrides)
  end

  test "valid with full attributes" do
    assert Note.new(valid_attrs).valid?
  end

  test "requires user" do
    note = Note.new(valid_attrs(user: nil))
    assert_not note.valid?
    assert note.errors[:user].any?
  end

  test "requires content" do
    note = Note.new(valid_attrs(content: nil))
    assert_not note.valid?
    assert note.errors[:content].any?
  end

  test "content must be between 1 and 500 characters" do
    note = Note.new(valid_attrs(content: ""))
    assert_not note.valid?
    assert note.errors[:content].any?

    note.content = "a" * 501
    assert_not note.valid?
    assert note.errors[:content].any?

    note.content = "Valid content"
    assert note.valid?
  end

  test "requires latitude and longitude" do
    note = Note.new(valid_attrs(latitude: nil, longitude: nil))
    assert_not note.valid?
    assert note.errors[:latitude].any?
    assert note.errors[:longitude].any?
  end

  test "latitude must be between -90 and 90" do
    note = Note.new(valid_attrs(latitude: -91))
    assert_not note.valid?
    assert note.errors[:latitude].any?

    note.latitude = 91
    assert_not note.valid?
    assert note.errors[:latitude].any?

    note.latitude = 45
    assert note.valid?
  end

  test "longitude must be between -180 and 180" do
    note = Note.new(valid_attrs(longitude: -181))
    assert_not note.valid?
    assert note.errors[:longitude].any?

    note.longitude = 181
    assert_not note.valid?
    assert note.errors[:longitude].any?

    note.longitude = 90
    assert note.valid?
  end

  test "max_views must be a positive integer if present" do
    note = Note.new(valid_attrs(max_views: -1))
    assert_not note.valid?
    assert note.errors[:max_views].any?

    note.max_views = 0
    assert_not note.valid?
    assert note.errors[:max_views].any?

    note.max_views = 1.5
    assert_not note.valid?
    assert note.errors[:max_views].any?

    note.max_views = 10
    assert note.valid?
  end

  test "expires_at must be in the future if present" do
    note = Note.new(valid_attrs(expires_at: 1.day.ago))
    assert_not note.valid?
    assert note.errors[:expires_at].any?

    note.expires_at = Time.current + 1.day
    assert note.valid?
  end

  test "view! increments views_count and respects max_views" do
    note = Note.create!(valid_attrs(max_views: 2))
    assert_equal 0, note.views_count

    note.view!
    assert_equal 1, note.views_count
    assert note.public_note?

    note.view!
    assert_equal 2, note.views_count
    assert note.archived?
  end

  test "view! does not increment views_count for private notes" do
    note = Note.create!(valid_attrs(visibility: :private_note))
    assert_equal 0, note.views_count

    note.view!
    assert_equal 0, note.views_count
    assert note.private_note?
  end

  test "active scope returns only active notes" do
    active_note = Note.create!(valid_attrs)
    expired_note = Note.create!(valid_attrs(expires_at: Time.current - 1.second))
    maxed_out_note = Note.create!(valid_attrs(max_views: 1))
    maxed_out_note.view!

    assert_includes Note.active, active_note
    assert_not_includes Note.active, expired_note
    assert_not_includes Note.active, maxed_out_note
  end

  test "visibility enum works correctly" do
    note = Note.new(valid_attrs)
    note.public_note!
    assert note.public_note?

    note.private_note!
    assert note.private_note?

    note.friends_only!
    assert note.friends_only?
  end

  test "belongs to user" do
    note = Note.new(valid_attrs)
    assert note.user
    assert_equal @user, note.user
  end
end
