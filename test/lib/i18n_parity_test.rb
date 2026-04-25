require "test_helper"

# Guards translation parity across +config/locales/*.yml+.
#
# Loads every available locale and asserts they expose the exact same set
# of dotted keys, preventing "key exists in en.yml but missing in es.yml"
# bugs from sneaking through review.
class I18nParityTest < ActiveSupport::TestCase
  # Directory holding the YAML files for every supported locale.
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

  # Recursively flatten a nested locale hash into dotted key paths.
  #
  # @param hash [Hash] nested locale tree as parsed from YAML.
  # @param prefix [String, nil] accumulated dotted path for recursion.
  # @return [Array<String>] every leaf key as a +"a.b.c"+ string.
  def flatten_keys(hash, prefix = nil)
    hash.flat_map do |key, value|
      path = [ prefix, key ].compact.join(".")
      value.is_a?(Hash) ? flatten_keys(value, path) : [ path ]
    end
  end
end
