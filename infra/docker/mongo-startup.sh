#!/bin/bash
set -euo pipefail

# Start MongoDB with replica set
mongod --replSet rs0 --bind_ip_all &
MONGO_PID=$!

# Wait for mongod to accept connections
echo "Waiting for MongoDB to start..."
for i in {1..30}; do
  if mongosh --quiet --eval "db.adminCommand('ping').ok" | grep -q 1; then
    echo "MongoDB is up"
    break
  fi
  sleep 1
done

# Initialize replica set if not already initialized
echo "Ensuring replica set is initiated..."
mongosh --quiet --eval "
  try {
    rs.status();
    print('Replica set already initialized');
  } catch (e) {
    print('Initializing replica set...');
    rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongodb:27017' }] });
  }
" || true

# Keep MongoDB running in foreground
wait $MONGO_PID