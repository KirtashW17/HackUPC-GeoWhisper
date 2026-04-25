module Notes
  # Periodic housekeeping job. Marks +archived = true+ on notes that have
  # outlived their TTL (+expires_at+) or exhausted their read budget
  # (+views_count >= max_views+) but still carry +archived = false+.
  #
  # Soft-archives only — the row stays. Physical purge is a separate
  # follow-up job (see +doc/plans/archive_expired_job.md+).
  #
  # Uses +update_all+ to avoid loading and saving each AR object: there are
  # no model callbacks tied to the +archived+ flag today, and the job is
  # expected to run over many rows at once.
  class ArchiveExpiredJob < ApplicationJob
    queue_as :default

    # @return [Integer] number of rows archived in this run.
    def perform
      now = Time.current
      Note
        .where(archived: false)
        .where(
          "(expires_at IS NOT NULL AND expires_at <= ?) OR " \
          "(max_views IS NOT NULL AND views_count >= max_views)",
          now
        )
        .update_all(archived: true, updated_at: now)
    end
  end
end
