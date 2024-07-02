Getesteter Betrieb:
 Öffnen des Frontends in Chromium-basiertem Browser direkt vom Dateisystem (kein Webserver),
 Betrieb des Backends mittels `npm start`.

Es war meinerseits eine Dockerfile mit Caddy webserver/proxy vorgesehen, das ist aber auf Gründen
der Zeitnot weggefallen.

Bekannter Fehler: Beim Versenden von Updates aus dem Frontend wird teilweise die GUI nicht richtig
                  aktualisiert. In diesem Fall, laden Sie die Seite bitte neu.
