# Rails wraps inputs whose model has errors in <div class="field_with_errors">.
# That extra div breaks our Tailwind card layout (the error wrapper sits
# *between* the form and the styled input, killing the rounded card border).
#
# We render errors ourselves via the `auth_field` helper (and any future
# field helper that follows the same pattern), so the default wrapper has
# nothing to add — strip it out and let the helper own the error UX.
#
# See doc/frontend.md → "Form errors".
ActionView::Base.field_error_proc = ->(html_tag, _instance) { html_tag }
