require "test_helper"

class UserTest < ActiveSupport::TestCase
  def valid_attrs(overrides = {})
    {
      email: "alice@example.com",
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
    User.create!(valid_attrs)
    duplicate = User.new(valid_attrs(email: "ALICE@EXAMPLE.COM"))
    assert_not duplicate.valid?
    assert duplicate.errors[:email].any?
  end

  test "email is normalized (stripped and downcased)" do
    user = User.create!(valid_attrs(email: "  Alice@Example.COM  "))
    assert_equal "alice@example.com", user.email
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
    user = User.create!(valid_attrs)
    user.sessions.create!
    assert_difference("Session.count", -1) do
      user.destroy
    end
  end
end
