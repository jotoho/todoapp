FROM debian:bookworm
COPY frontend /todoapp/frontend
COPY backend /todoapp/backend
COPY Caddyfile /etc/caddy/Caddyfile
RUN apt-get update
RUN apt-get full-upgrade --assume-yes
RUN apt-get install --assume-yes caddy npm nodejs gnupg curl
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
RUN echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
RUN apt-get update && apt-get install --assume-yes mongodb-org
#RUN systemctl enable --now caddy
EXPOSE 80/tcp
