#!/bin/bash
set -e

# Generate keyfile for replica set authentication
openssl rand -base64 756 > /tmp/keyfile
chmod 400 /tmp/keyfile
chown 999:999 /tmp/keyfile

# Start MongoDB with replica set and keyfile
mongod --replSet rs0 --bind_ip_all --keyFile /tmp/keyfile &
MONGO_PID=$!

# Wait for MongoDB to start
echo "Waiting for MongoDB to start..."
sleep 10

# Initialize replica set if not already initialized
mongosh -u admin -p admin123 --authenticationDatabase admin --eval "
  try {
    var status = rs.status();
    print('Replica set already initialized');
  } catch(e) {
    print('Initializing replica set...');
    rs.initiate({
      _id: 'rs0',
      members: [{_id: 0, host: 'localhost:27017'}]
    });
  }
" || true

# Keep MongoDB running
wait $MONGO_PID