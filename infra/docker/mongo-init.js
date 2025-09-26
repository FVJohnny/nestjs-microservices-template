// Wait for MongoDB to be ready
sleep(5000);

// Initialize replica set
rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "mongodb:27017"
    }
  ]
});

// Wait for replica set to initialize
sleep(5000);