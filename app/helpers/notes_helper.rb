# View helpers for whisper-related templates (map, detail, compose).
module NotesHelper
  # Render the lifecycle progress bars on the detail screen as a
  # discrete Tailwind width class (`w-N/12`). Bucketing avoids inline
  # `style="width:Y%"` while keeping enough resolution for the eye
  # (12 steps = 8.3 % each).
  #
  # @param percent [Numeric] 0..100 fraction filled.
  # @return [String] a Tailwind width utility class.
  # @example
  #   progress_width_class(35) #=> "w-4/12"
  #   progress_width_class(100) #=> "w-full"
  def progress_width_class(percent)
    bucket = (percent.to_f / 100 * 12).round.clamp(0, 12)

    case bucket
    when 0  then "w-0"
    when 12 then "w-full"
    else         "w-#{bucket}/12"
    end
  end
end
