# Static frontend served by Nginx
FROM nginx:alpine

# Copy site content
COPY ./ /usr/share/nginx/html/

# Expose default Nginx port
EXPOSE 80

# Use default nginx config (sufficient for static files)
CMD ["nginx", "-g", "daemon off;"]
