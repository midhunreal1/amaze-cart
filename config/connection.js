require('dotenv').config();
const { MongoClient }= require('mongodb');

const state = {
  db: null,
};

const url = process.env.MONGO_URI;
const dbname = 'shopping';

module.exports.connect = async function (done) {
  try {
    const client = new MongoClient(url, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    await client.connect();
    // Test the connection
    await client.db('admin').command({ ping: 1 });
    state.db = client.db(dbname);
    console.log('Connected to MongoDB Atlas successfully');
    done();
  } catch (err) {
    console.log('MongoDB connection error:', err.message);
    // Try alternative connection approach
    console.log('Attempting alternative connection...');
    try {
      const altClient = new MongoClient(url.replace('mongodb+srv://', 'mongodb://').replace('?retryWrites=true&w=majority', ''));
      await altClient.connect();
      state.db = altClient.db(dbname);
      console.log('Connected via alternative method');
      done();
    } catch (altErr) {
      console.log('Alternative connection also failed:', altErr.message);
      done(err);
    }
  }
};

module.exports.get = function () {
  return state.db;
};
