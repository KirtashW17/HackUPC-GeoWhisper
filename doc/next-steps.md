# Next steps — backlog operativo

> Tareas pequeñas pendientes que han surgido durante el trabajo, no asignadas
> a una fase concreta del MVP. Se vacían al hacerlas; lo que es post-MVP se
> mueve a [`future.md`](future.md).

## Diseño (pendiente de Claude Design)

- [ ] **Mockup de estados de error en formularios** — login y signup: cómo se ve un email inválido, password incorrecto, mismatch de passwords, validaciones backend que vuelven al form. Idealmente con la pill terracotta arriba del form, pero abierto a propuesta del diseñador. Una vez recibido se incorpora a las vistas auth de la Fase 1.
- [ ] **UI del locale switcher en `/profile`** — pendiente; aún no diseñada. Se hará cuando exista la pantalla de profile (Fase 2+).

## Técnico

- [ ] **Configurar `i18n-tasks`** — gem ya instalada. Falta `config/i18n-tasks.yml` con paths de las locales y los `data` para detectar uso. Sustituir el test casero `I18nParityTest` por `bin/i18n-tasks health` en CI.
- [ ] **Verificar pipeline CI** — tras añadir auth, i18n y Tailwind, asegurarse de que los 4 jobs siguen verdes (`brakeman`, `importmap audit`, `rubocop`, `tests`).
