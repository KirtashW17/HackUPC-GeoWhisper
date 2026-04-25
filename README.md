# GeoWhisper — Ghost Notes geolocalizadas y efímeras

**GeoWhisper** es una aplicación web para dejar notas digitales ancladas a un lugar físico. Las notas solo se hacen visibles cuando otros usuarios pasan cerca del punto donde se dejaron, y se autodestruyen al cumplir cierto tiempo o al ser leídas un número máximo de veces.

## Contexto

Este proyecto se desarrolla durante el **HackUPC** como prototipo de red social basada en geolocalización y mensajes efímeros. La idea completa, mecánicas y stretch goals están detallados a [`doc/inception.md`](doc/inception.md).

GeoWhisper permite:
- **Crear notas** ancladas a la ubicación actual del usuario (lat/lng del navegador)
- **Descubrir notas cercanas** dentro de un radio configurable
- **Expiración automática** por tiempo (`expires_at`) y/o por número de visualizaciones (`max_views`)
- *(futuro)* Visibilidad pública, solo para amigos o destinatario único
- *(futuro)* Vista de mapa interactivo con las notas cercanas

---

## Requisitos previos

- **Ruby 3.1.2** — se recomienda gestionarlo con [rbenv](https://github.com/rbenv/rbenv)
- **Bundler** — gestor de dependencias de Ruby
- **SQLite3** — base de datos usada en desarrollo y test

### Instalar Ruby con rbenv

```bash
# Instalar rbenv (si no lo tienes)
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
echo 'eval "$(~/.rbenv/bin/rbenv init - bash)"' >> ~/.bashrc
source ~/.bashrc

# Instalar ruby-build (plugin para instalar versiones de Ruby)
git clone https://github.com/rbenv/ruby-build.git "$(rbenv root)"/plugins/ruby-build

# Instalar la versión correcta (definida a .ruby-version) y dependencias del sistema
sudo apt update
sudo apt install build-essential ruby-dev libyaml-dev ruby-bundler libsqlite3-dev pkg-config zlib1g-dev
rbenv install 3.1.2
```

Una vez dentro del directorio del proyecto, `rbenv` seleccionará automáticamente la versión `3.1.2` gracias al fichero `.ruby-version`.

---

## Preparar el entorno de desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/<org>/GeoWhisper.git
cd GeoWhisper

# Instalar las dependencias
# Opción A — instalación estándar (recomendada si tienes permisos)
bundle config set --local path ./vendor/bundle
bundle install

# Opción B — instalación en un directorio local (útil en entornos compartidos)
bundle install --path vendor/bundle
```

> Si usas la opción B, recuerda que todos los comandos de Rails deben ejecutarse con el prefijo `bundle exec`.

```bash
# Crear e inicializar la base de datos (SQLite)
bin/rails db:create db:migrate

# (Opcional) Cargar datos de prueba
bin/rails db:seed
```

---

## Ejecutar la aplicación

En desarrollo lo recomendado es usar `bin/dev`, que arranca el servidor Rails y el watcher de Tailwind en paralelo (definidos en `Procfile.dev`):

```bash
bin/dev
```

Si solo necesitas el servidor sin el watcher de CSS:

```bash
bin/rails server
# o si has instalado las gems localmente:
bundle exec rails server
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### Tailwind CSS

Tailwind se gestiona con el gem **`tailwindcss-rails`** (sin Node ni npm). El CSS compilado vive en `app/assets/builds/tailwind.css`, que es un **artefacto de build** y **no se chequea en el repo** — cada máquina dev lo genera localmente y el deploy lo regenera durante `assets:precompile`.

Tras clonar, si ves un error tipo "tailwind.css no existe", genera el build:

```bash
# Build único
bin/rails tailwindcss:build

# Watch en paralelo (recompila al editar clases)
bin/rails tailwindcss:watch
```

`bin/dev` ya lanza el watcher automáticamente, así que en el flujo normal no hace falta invocarlos a mano.

> **Nota sobre geolocalización:** la API de Geolocation del navegador requiere un *secure context*. En `localhost` funciona; al desplegar a otro host necesitarás HTTPS para que el navegador entregue las coordenadas.

---

## Ejecutar los tests

El proyecto usa **MiniTest**, el framework de tests por defecto de Rails.

> **Metodología TDD obligatoria:** todas las funcionalidades se desarrollan siguiendo *Test-Driven Development* (red → green → refactor). Antes de escribir código de producción debe existir un test que falle, y todas las funcionalidades —modelos, controladores, vistas, jobs y flujos de sistema— deben estar **escrupulosamente testeadas**. No se aceptan PRs con código sin cobertura de tests.

```bash
# Todos los tests
bin/rails test

# Solo tests de modelos
bin/rails test test/models/

# Solo tests de controladores
bin/rails test test/controllers/

# Un test concreto
bin/rails test test/models/note_test.rb
```

> **Sin tests de sistema.** El proyecto **no** usa tests de sistema. Toda la cobertura va por tests de modelo, controlador e integración (`ActionDispatch::IntegrationTest`).

---

## Herramientas de calidad de código

El proyecto exige el uso de las siguientes herramientas. Cualquier cambio debe pasar **RuboCop** sin warnings y **Brakeman** sin alertas nuevas antes de ser fusionado.

```bash
# Linting de estilo Ruby/Rails (RuboCop) — obligatorio
bin/rubocop

# Autocorrección de violaciones triviales
bin/rubocop -a

# Análisis estático de seguridad (Brakeman) — obligatorio
bin/brakeman
```

---

## Internacionalización (i18n)

GeoWhisper utiliza el sistema de **internacionalización i18n de Rails** para todos los textos visibles al usuario. Es **obligatorio**:

- **No hardcodear strings** en vistas, controladores, mailers ni flash messages. Todos los textos deben pasar por `t("clave.de.traduccion")` o `I18n.t(...)`.
- Definir las claves en los ficheros de `config/locales/` (`es.yml`, `en.yml`, ...) siguiendo la jerarquía del recurso (`notes.create.success`, etc.).
- Mantener **paridad de claves** entre todos los idiomas soportados; una clave nueva en `es.yml` debe añadirse también al resto de locales.
- Los mensajes de validación de modelos deben usar las claves estándar de `activerecord.errors` / `activemodel.errors`.

---

## Estructura del proyecto

```
app/
  controllers/    # Lógica de peticiones HTTP
  models/         # Modelos ActiveRecord (User, Note, ...)
  views/          # Plantillas ERB
  javascript/     # Stimulus controllers (geolocalización, mapa, ...)
config/
  routes.rb       # Definición de rutas RESTful
db/
  migrate/        # Migraciones de la base de datos
doc/
  inception.md    # Visión del proyecto, MVP y stretch goals
test/             # Tests MiniTest
```

---

## Stack técnico

- **Ruby on Rails 7.2** + Hotwire/Turbo + Stimulus
- **SQLite** como base de datos (desarrollo, test y MVP)
- **Tailwind CSS** vía `tailwindcss-rails` (binario standalone, sin Node)
- **Active Job** (backend por defecto) para jobs en segundo plano como la purga de notas expiradas
- **Leaflet + OpenStreetMap** para la vista de mapa (sin API key)
- **Geolocation API** del navegador para capturar coordenadas
