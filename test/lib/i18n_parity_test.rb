require "test_helper"

class I18nParityTest < ActiveSupport::TestCase
  LOCALE_DIR = Rails.root.join("config/locales")

  test "all supported locales share the same set of keys" do
    locales = I18n.available_locales

    flat_keys = locales.to_h do |loc|
      data = YAML.load_file(LOCALE_DIR.join("#{loc}.yml"))
      [ loc, flatten_keys(data[loc.to_s]).sort ]
    end

    base_locale = flat_keys.keys.first
    base_keys = flat_keys[base_locale]

    flat_keys.each do |loc, keys|
      next if loc == base_locale

      missing = base_keys - keys
      extra   = keys - base_keys

      assert missing.empty?, "Locale #{loc} is missing keys: #{missing.inspect}"
      assert extra.empty?,   "Locale #{loc} has extra keys: #{extra.inspect}"
    end
  end

  private

  def flatten_keys(hash, prefix = nil)
    hash.flat_map do |key, value|
      path = [ prefix, key ].compact.join(".")
      value.is_a?(Hash) ? flatten_keys(value, path) : [ path ]
    end
  end
end
