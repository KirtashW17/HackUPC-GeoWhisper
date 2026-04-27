1. Instalar mkcert y crear la CA local

# Debian/Ubuntu
sudo apt install libnss3-tools
# instala mkcert (binario)
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# crea e instala la CA local en tu sistema
mkcert -install

Esto crea una CA en ~/.local/share/mkcert/ (mira la ruta exacta con mkcert -CAROOT). El fichero clave es rootCA.pem.

2. Generar el certificado para tu IP de LAN

Averigua tu IP local (algo como 192.168.1.42):

ip -4 addr show | grep inet

Genera el cert incluyendo localhost, la IP, y opcionalmente un nombre geowhisper.local:

cd /home/tscalise/git/HackUpc/GeoWhisper
mkdir -p config/ssl
cd config/ssl
mkcert 192.168.1.42 localhost 127.0.0.1 geowhisper.local
# genera: 192.168.1.42+3.pem  y  192.168.1.42+3-key.pem

Añade config/ssl/ a .gitignore para no commitear claves.

3. Arrancar Rails sobre HTTPS

Puma soporta SSL nativo. Lanza así:

bin/rails s -b "ssl://0.0.0.0:3000?key=config/ssl/192.168.1.42+3-key.pem&cert=config/ssl/192.168.1.42+3.pem"

(El 0.0.0.0 es necesario para que sea accesible desde el móvil; si dejas localhost no llega por LAN.)

También necesitarás permitir el host en config/environments/development.rb:

config.hosts << "192.168.1.42"
config.hosts << "geowhisper.local"

Y reinicia.

4. Confiar en la CA desde Android

Necesitas el rootCA.pem en el móvil:

cp "$(mkcert -CAROOT)/rootCA.pem" ~/rootCA.crt

Pásalo al teléfono (USB, Drive, email, python3 -m http.server en LAN…). Luego en el Android:

1. Ajustes → Seguridad y privacidad → Más ajustes de seguridad → Cifrado y credenciales → Instalar un certificado → Certificado CA (la ruta varía un poco según fabricante: busca "Instalar certificado CA" o "Instalar desde
   almacenamiento").
2. Acepta el aviso de "tu red podría estar monitorizada" — es normal porque le estás diciendo al sistema que confíe en una CA tuya.
3. Selecciona el rootCA.crt que copiaste.
4. Es posible que te pida poner un PIN/patrón de pantalla si no lo tenías.

Una vez instalado, Chrome y Firefox móvil aceptarán los certificados firmados por tu CA sin advertencias.

5. Acceder desde el móvil

Conecta el móvil a la misma red WiFi que el portátil y abre:

https://192.168.1.42:3000

La geolocalización del navegador te funcionará porque ya estás en contexto seguro (HTTPS), que es exactamente lo que necesita GeoWhisper.

Notas y problemas comunes

- Firewall: si no carga, abre el puerto 3000 en el host: sudo ufw allow 3000/tcp (si usas ufw).
- Chrome user-CA en Android 14+: para navegar funciona sin problema. Las restricciones de "user CA" solo afectan a apps nativas con networkSecurityConfig, no al navegador.
- App nativa / WebView: si en algún momento envuelves la PWA en una app Android, tendrás que añadir un network_security_config.xml que confíe en user CAs en debug, o usar mkcert -pkcs12 y empaquetar.
- IP cambia: si tu portátil coge otra IP por DHCP, tendrás que regenerar el cert (o reservar IP en el router). Por eso conviene también añadir geowhisper.local y configurar esa entrada en /etc/hosts del portátil + en el móvil
  con una app tipo "Hosts Editor" — o mejor, usa la IP fija.
- Alternativa sin instalar CA: usar un túnel tipo ngrok http 3000 o cloudflared te da una URL HTTPS pública con cert válido, y te ahorras todo lo de la CA. Útil si solo quieres demos rápidas.
