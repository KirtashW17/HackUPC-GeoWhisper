# Abstract base for every Active Job in the app.
#
# Subclass this rather than +ActiveJob::Base+ directly so retry/discard
# defaults can be added in a single place (e.g. retrying on deadlocks,
# discarding on deserialization errors).
class ApplicationJob < ActiveJob::Base
  # Automatically retry jobs that encountered a deadlock
  # retry_on ActiveRecord::Deadlocked

  # Most jobs are safe to ignore if the underlying records are no longer available
  # discard_on ActiveJob::DeserializationError
end
