ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

# Suppress SQLite fork-safety warnings — safe here because Rails
# re-establishes DB connections in each forked test worker.
SQLite3::ForkSafety.suppress_warnings!

module ActiveSupport
  # Project-wide MiniTest base case.
  #
  # Boots Rails in the +test+ environment, loads every fixture in
  # +test/fixtures/*.yml+ alphabetically, and parallelizes across one worker
  # per CPU. Add cross-cutting test helpers here.
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Shared plaintext password for every fixture user. Tests that need to
    # exercise sign-in flows reference this to avoid duplicating the literal.
    FIXTURE_PASSWORD = "secret123".freeze
  end
end

module ActionDispatch
  class IntegrationTest
    # Sign in the given user via the public session endpoint, so the
    # cookie-based authentication used by controllers is fully exercised.
    #
    # @param user [User] persisted user (typically a fixture).
    # @param password [String] plaintext password; defaults to the shared
    #   fixture password.
    # @return [void]
    def sign_in_as(user, password: ActiveSupport::TestCase::FIXTURE_PASSWORD)
      post session_path, params: { email: user.email, password: password }
    end
  end
end
