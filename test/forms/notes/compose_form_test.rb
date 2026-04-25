require "test_helper"

# Validation coverage for {Notes::ComposeForm}: required fields, lat/lng
# range, content length, language and visibility whitelists, and the
# UI-only TTL / max-views caps.
class Notes::ComposeFormTest < ActiveSupport::TestCase
  # Build a hash of attributes that satisfy every validation, with optional
  # overrides for the field under test.
  #
  # @param overrides [Hash] keys to overwrite on top of the valid baseline.
  # @return [Hash{Symbol => Object}] a complete, valid attribute set.
  def valid_attrs(overrides = {})
    {
      content: "Sit by the window — saffron buns at 4.",
      latitude: 41.2236,
      longitude: 1.7280,
      ttl_seconds: 1.hour.to_i,
      max_views: 5,
      language: "en",
      visibility: "public_note"
    }.merge(overrides)
  end

  test "valid with full attributes" do
    assert Notes::ComposeForm.new(valid_attrs).valid?
  end

  test "requires content" do
    form = Notes::ComposeForm.new(valid_attrs(content: ""))
    assert_not form.valid?
    assert form.errors[:content].any?
  end

  test "rejects content over 500 characters" do
    form = Notes::ComposeForm.new(valid_attrs(content: "x" * 501))
    assert_not form.valid?
  end

  test "requires latitude in range" do
    [ -91, 91 ].each do |bad|
      form = Notes::ComposeForm.new(valid_attrs(latitude: bad))
      assert_not form.valid?, "expected #{bad} latitude to be invalid"
    end
  end

  test "requires longitude in range" do
    [ -181, 181 ].each do |bad|
      form = Notes::ComposeForm.new(valid_attrs(longitude: bad))
      assert_not form.valid?, "expected #{bad} longitude to be invalid"
    end
  end

  test "rejects unsupported language" do
    form = Notes::ComposeForm.new(valid_attrs(language: "fr"))
    assert_not form.valid?
  end

  test "rejects unsupported visibility" do
    form = Notes::ComposeForm.new(valid_attrs(visibility: "secret"))
    assert_not form.valid?
  end

  test "rejects ttl below 60 seconds" do
    form = Notes::ComposeForm.new(valid_attrs(ttl_seconds: 30))
    assert_not form.valid?
  end

  test "rejects ttl above the 30-day UI cap" do
    form = Notes::ComposeForm.new(valid_attrs(ttl_seconds: 31.days.to_i))
    assert_not form.valid?
  end

  test "accepts blank ttl as permanent" do
    form = Notes::ComposeForm.new(valid_attrs(ttl_seconds: nil))
    assert form.valid?, form.errors.full_messages.inspect
    assert_nil form.expires_at
  end

  test "rejects max_views above the 1000 cap" do
    form = Notes::ComposeForm.new(valid_attrs(max_views: 1_001))
    assert_not form.valid?
  end

  test "expires_at is derived from ttl_seconds" do
    form = Notes::ComposeForm.new(valid_attrs(ttl_seconds: 1.hour.to_i))
    assert_in_delta Time.current + 1.hour, form.expires_at, 2
  end

  test "to_note_params shapes the future Note.create payload" do
    form = Notes::ComposeForm.new(valid_attrs(max_views: 5))
    params = form.to_note_params

    assert_equal "Sit by the window — saffron buns at 4.", params[:content]
    assert_equal 41.2236, params[:latitude]
    assert_equal "en", params[:language]
    assert_equal "public_note", params[:visibility]
    assert_equal 5, params[:max_views]
    assert params[:expires_at]
  end
end
