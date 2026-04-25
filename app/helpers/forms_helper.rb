module FormsHelper
  # Renders an "AuthField"-style input — the rounded card from the prototype
  # (prototype/screens-2.jsx :: AuthField) with the inline error treatment
  # described in doc/frontend.md.
  #
  # Usage in a form_with block:
  #
  #   <%= auth_field(f, :email,    label: t("auth.fields.email"),
  #                  type: :email, autocomplete: "email", autofocus: true) %>
  #
  # When `form.object.errors[attribute]` has entries, the field paints a
  # 1.5px error-ink border, a soft halo, and renders a role="alert" message
  # below with a small ! glyph.
  def auth_field(form, attribute, label:, type: :text, autocomplete: nil, autofocus: false)
    errors = Array(form.object&.errors&.[](attribute))
    errored = errors.any?
    field_id = "#{form.object_name}_#{attribute}"
    error_id = "#{field_id}-error"

    container_class = [
      "rounded-card bg-card px-3.5 py-2.5 transition-shadow duration-150",
      errored ? "border-[1.5px] border-error-ink shadow-[0_0_0_3px_theme(colors.error-halo)]" : "border border-card-edge"
    ].join(" ")

    label_class = [
      "block font-mono text-[9px] uppercase tracking-eyebrow",
      errored ? "text-error-ink" : "text-ink-soft"
    ].join(" ")

    input_class = [
      "mt-0.5 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-faint",
      type.to_sym == :password ? "font-sans" : "font-serif"
    ].join(" ")

    field_method = case type.to_sym
    when :email    then :email_field
    when :password then :password_field
    else :text_field
    end

    input_options = {
      class: input_class,
      autocomplete: autocomplete,
      autofocus: autofocus,
      "aria-invalid": errored ? "true" : nil,
      "aria-describedby": errored ? error_id : nil
    }.compact

    tag.div(class: "flex flex-col") do
      concat(
        tag.div(class: container_class, "aria-invalid": errored ? "true" : nil) do
          concat form.label(attribute, label, class: label_class)
          concat form.public_send(field_method, attribute, **input_options)
        end
      )

      if errored
        concat(
          tag.p(role: "alert", id: error_id,
                class: "mt-1.5 flex items-center gap-1.5 px-1 font-sans text-xs font-medium text-error-ink") do
            concat error_glyph
            concat tag.span(errors.first)
          end
        )
      end
    end
  end

  # Top-of-form alert pill — used for form-wide errors (e.g. "Wrong email
  # or password" on login, where the failure isn't tied to a single field).
  #
  # The pill currently uses the original `accent` (terracotta) family so it
  # reads as "advisory, not catastrophic" — these messages aren't validation
  # errors per se, they're login/system feedback. Field-level validation
  # errors use the redder `error-ink` family inside `auth_field`.
  #
  # Alternative styling — switch to the redder error palette to match
  # field-level errors. Uncomment to try:
  #
  #     class: "rounded-card border border-error-ink/40 bg-error-halo/30 px-4 py-2.5 text-sm text-error-ink"
  def auth_form_alert(message)
    return if message.blank?

    tag.div(role: "alert",
            class: "rounded-card border border-accent/30 bg-accent-soft/40 px-4 py-2.5 text-sm text-accent") do
      concat error_glyph
      concat tag.span(message, class: "ml-2 align-middle")
    end
  end

  private

  def error_glyph
    tag.svg(width: "13", height: "13", viewBox: "0 0 13 13", "aria-hidden": "true",
            class: "inline-block shrink-0") do
      concat tag.circle(cx: "6.5", cy: "6.5", r: "6", fill: "none",
                        stroke: "currentColor", "stroke-width": "1.4")
      concat tag.path(d: "M6.5 3.4 V7.2", stroke: "currentColor",
                      "stroke-width": "1.4", "stroke-linecap": "round")
      concat tag.circle(cx: "6.5", cy: "9.3", r: "0.8", fill: "currentColor")
    end
  end
end
