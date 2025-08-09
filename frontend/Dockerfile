# Static frontend served by Nginx
FROM nginx:alpine

# Copy site content
COPY ./ /usr/share/nginx/html/

# Provide Nginx config template (rendered by default entrypoint using envsubst)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Expose default Nginx port
EXPOSE 80

# Use default Nginx entrypoint/CMD (renders templates and starts nginx)
