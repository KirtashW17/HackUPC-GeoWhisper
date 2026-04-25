require "test_helper"

# Validations and association behavior for {User}.
#
# Covers presence/format/uniqueness on email, supported-language whitelist,
# email normalization, and the cascading +dependent: :destroy+ on sessions.
class UserTest < ActiveSupport::TestCase
  # Build a hash of attributes that satisfy every validation, with optional
  # overrides for the field under test.
  #
  # @param overrides [Hash] keys to overwrite on top of the valid baseline.
  # @return [Hash{Symbol => Object}] a complete, valid attribute set.
  def valid_attrs(overrides = {})
    {
      email: "tester@example.com",
      password: "secret123",
      password_confirmation: "secret123",
      language: "en"
    }.merge(overrides)
  end

  test "valid with full attributes" do
    assert User.new(valid_attrs).valid?
  end

  test "requires email" do
    user = User.new(valid_attrs(email: nil))
    assert_not user.valid?
    assert user.errors[:email].any?
  end

  test "requires well-formed email" do
    user = User.new(valid_attrs(email: "not-an-email"))
    assert_not user.valid?
    assert user.errors[:email].any?
  end

  test "email is unique case-insensitively" do
    duplicate = User.new(valid_attrs(email: users(:alice).email.upcase))
    assert_not duplicate.valid?
    assert duplicate.errors[:email].any?
  end

  test "email is normalized (stripped and downcased)" do
    user = User.create!(valid_attrs(email: "  Tester@Example.COM  "))
    assert_equal "tester@example.com", user.email
  end

  test "requires password" do
    user = User.new(valid_attrs.except(:password, :password_confirmation))
    assert_not user.valid?
  end

  test "language must be one of the supported locales" do
    user = User.new(valid_attrs(language: "fr"))
    assert_not user.valid?
    assert user.errors[:language].any?
  end

  test "accepts en, es, ca as language" do
    %w[en es ca].each do |lang|
      assert User.new(valid_attrs(language: lang, email: "u-#{lang}@x.com")).valid?
    end
  end

  test "language defaults to en" do
    user = User.create!(valid_attrs.except(:language))
    assert_equal "en", user.language
  end

  test "has many sessions, destroyed with the user" do
    user = users(:bob)
    user.sessions.create!
    assert_difference("Session.count", -1) do
      user.destroy
    end
  end
end
