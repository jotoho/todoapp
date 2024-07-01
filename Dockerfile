FROM debian:bookworm
COPY frontend /todoapp/frontend
COPY backend /todoapp/backend
COPY Caddyfile /etc/caddy/Caddyfile
RUN apt-get update
RUN apt-get full-upgrade --assume-yes
RUN apt-get install --assume-yes caddy npm nodejs
#RUN systemctl enable --now caddy
EXPOSE 80/tcp
