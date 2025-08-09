# Static frontend served by Nginx
FROM nginx:alpine

# Copy site content
COPY ./ /usr/share/nginx/html/

# Use custom Nginx config (adds reverse proxy for APIs)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose default Nginx port
EXPOSE 80

# Use default nginx config (sufficient for static files)
CMD ["nginx", "-g", "daemon off;"]
