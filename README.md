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

## Probar la app desde un dispositivo móvil (HTTPS vía túnel)

La Geolocation API solo se activa en *secure contexts* (HTTPS). Tu navegador hace una excepción para `localhost` / `127.0.0.1`, **pero no para IPs de red local** (tipo `192.168.x.x`). Si abres el dev server desde el móvil con la IP de tu LAN, el prompt de ubicación nunca aparece y la app se queda en blanco. Para la demo y cualquier prueba móvil necesitamos un **túnel HTTPS**.

### Flujo recomendado: `localhost.run` (sin cuenta)

Solo necesitas un cliente SSH (preinstalado en macOS/Linux; en Windows usa el de Git Bash o WSL).

1. **Terminal 1 — dev server:**
   ```bash
   bin/dev
   ```

2. **Terminal 2 — túnel:**
   ```bash
   ssh -R 80:localhost:3000 nokey@localhost.run
   ```

   La primera vez te pedirá aceptar el host fingerprint (`yes`). Después imprime algo como:

   ```
   2c4e7f9a8d.lhr.life tunneled with tls termination, https://2c4e7f9a8d.lhr.life
   ```

3. Abre **esa URL `https://...lhr.life`** en el móvil. El navegador pedirá permiso de ubicación al entrar a `/map`.

**Notas:**
- La URL **cambia** cada vez que matas y relanzas el túnel. Si la URL queda en una pestaña vieja del móvil tras un reinicio, hay que cargar la URL nueva.
- La sesión SSH puede colgarse tras un rato de inactividad — `Ctrl+C` y relanzar.
- `*.lhr.life`, `*.ngrok-free.app`, `*.serveo.net` y `*.trycloudflare.com` ya están autorizados en `config/environments/development.rb` (`config.hosts`).

### Alternativa: `ngrok`

```bash
npx ngrok http 3000
```

Pide cuenta gratis la primera vez (`ngrok config add-authtoken …`). Misma idea — devuelve una URL `https://abc-123.ngrok-free.app`. Si demoamos delante de mucha gente y el throughput de `localhost.run` no aguanta, el plan free de ngrok suele ir mejor.

### Cuándo *no* hace falta el túnel

- Si pruebas desde el portátil/desktop apuntando a `http://localhost:3000`, todo funciona sin túnel — el navegador trata `localhost` como secure context.
- Tests automáticos no llaman a Geolocation (no podemos mockear `navigator.geolocation` sin browser real), así que el túnel no es relevante para la suite.

---

## Ejecutar los tests

El proyecto usa **MiniTest**, el framework de tests por defecto de Rails.

> **Metodología TDD obligatoria:** todas las funcionalidades se desarrollan siguiendo *Test-Driven Development* (red → green → refactor). Antes de escribir código de producción debe existir un test que falle, y todas las funcionalidades —modelos, controladores, vistas, jobs y flujos de sistema— deben estar **escrupulosamente testeadas**. No se aceptan PRs con código sin cobertura de tests.

```bash
# Todos los tests
bin/rails test

# Por carpeta
bin/rails test test/models/
bin/rails test test/controllers/
bin/rails test test/integration/

# Un fichero concreto
bin/rails test test/models/note_test.rb

# Un único test por número de línea (útil para iterar rápido)
bin/rails test test/models/note_test.rb:42

# Filtrar por nombre (regex sobre el nombre del test)
bin/rails test test/models/note_test.rb -n /view/
```

> Si instalaste las gems con `bundle install --path vendor/bundle`, recuerda prefijar los comandos con `bundle exec` (p. ej. `bundle exec bin/rails test`).

La suite corre **en paralelo** (un worker por CPU, configurado en `test/test_helper.rb`) y carga automáticamente todas las fixtures de `test/fixtures/*.yml`.

> **Sin tests de sistema.** El proyecto **no** usa tests de sistema. Toda la cobertura va por tests de modelo, controlador e integración (`ActionDispatch::IntegrationTest`).

### Datos de prueba: preferir fixtures

Cuando un test necesita un registro persistido, lo idiomático es usar una **fixture** en `test/fixtures/*.yml` antes que construir el registro inline con `Model.create!`. Las fixtures se cargan una sola vez por ejecución y mantienen los tests centrados en el comportamiento que prueban.

```ruby
class NotesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:alice)   # fixture de test/fixtures/users.yml
    sign_in_as(@user)       # helper definido en test/test_helper.rb
  end
end
```

La contraseña compartida por las fixtures de usuario está expuesta como `ActiveSupport::TestCase::FIXTURE_PASSWORD` para tests que necesiten autenticarse con un email distinto al de fixture.

La construcción inline (`User.new(...)`, `Note.create!(...)`) sigue siendo apropiada cuando el test ejerce específicamente el camino de creación/validación, o cuando necesita un atributo que ninguna fixture debería llevar; en ese caso, mantén los identificadores (emails, etc.) distintos a los de las fixtures para no chocar con la validación de unicidad.

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

## Documentación de código (YARD)

Cada función, clase y módulo público debe documentarse con **[YARD](https://yardoc.org/)**. Es **obligatorio**:

- Toda definición pública (métodos, clases, módulos) lleva una docstring con:
  - Una línea de resumen.
  - Una etiqueta `@param` por argumento con tipo y descripción.
  - Una etiqueta `@return` con tipo y descripción.
  - `@example` cuando la llamada no sea obvia.
- Métodos `private` pueden omitir la docstring si el nombre y firma son auto-explicativos.
- Cuando toques código existente sin documentar, **añade YARD** como parte del cambio.

Ejemplo mínimo:

```ruby
# Returns the canonical post-login redirect URL for the current user.
#
# @return [String] welcome URL when the user has not completed onboarding,
#   otherwise the map URL.
def post_authentication_url
  return welcome_url unless Current.user&.onboarded_at
  map_url
end
```

Para generar la documentación HTML localmente:

```bash
gem install yard          # primera vez
yardoc 'app/**/*.rb'      # genera ./doc/yard
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
