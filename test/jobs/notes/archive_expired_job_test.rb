require "test_helper"

class Notes::ArchiveExpiredJobTest < ActiveJob::TestCase
  def setup
    @user = users(:alice)
  end

  def base_attrs(overrides = {})
    {
      user: @user,
      content: "This is a note.",
      latitude: 41.3874,
      longitude: 2.1686
    }.merge(overrides)
  end

  test "archives notes whose expires_at has passed" do
    expired = notes(:expired_brunch)
    assert_not expired.archived?

    Notes::ArchiveExpiredJob.perform_now

    assert expired.reload.archived?
  end

  test "archives notes that exhausted their max_views" do
    maxed = Note.create!(base_attrs(max_views: 3, views_count: 3))
    # Skip view! by writing the column directly so we can target the job.
    maxed.update_column(:archived, false)

    Notes::ArchiveExpiredJob.perform_now

    assert maxed.reload.archived?
  end

  test "does not archive notes that are still active" do
    active = notes(:campus_nord_vending)
    refute active.archived?

    Notes::ArchiveExpiredJob.perform_now

    assert_not active.reload.archived?
  end

  test "does not archive notes without time or view limits" do
    permanent = notes(:permanent_term)
    refute permanent.archived?

    Notes::ArchiveExpiredJob.perform_now

    assert_not permanent.reload.archived?
  end

  test "is idempotent and a second run archives nothing" do
    first  = Notes::ArchiveExpiredJob.perform_now
    second = Notes::ArchiveExpiredJob.perform_now

    assert_operator first, :>=, 1
    assert_equal 0, second
  end

  test "returns the number of rows archived" do
    expected = Note.where(archived: false).where(
      "(expires_at IS NOT NULL AND expires_at <= ?) OR " \
      "(max_views IS NOT NULL AND views_count >= max_views)",
      Time.current
    ).count

    archived_count = Notes::ArchiveExpiredJob.perform_now

    assert_equal expected, archived_count
  end

  test "does not touch already-archived notes" do
    already = notes(:archived_projector)
    original_updated_at = already.updated_at

    travel 1.minute do
      Notes::ArchiveExpiredJob.perform_now
    end

    assert already.reload.archived?
    assert_in_delta original_updated_at.to_f, already.updated_at.to_f, 1.0
  end
end
