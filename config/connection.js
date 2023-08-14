const { MongoClient }= require('mongodb');

const state = {
  db: null,
};

const url = 'mongodb://0.0.0.0:27017/';
const dbname = 'shopping';

module.exports.connect = function (done) {
  const client = new MongoClient(url, { useUnifiedTopology: true });

  client.connect((err) => {
    if (err) {
      return done(err);
    }
    state.db = client.db(dbname);
    done();
  });
};

module.exports.get = function () {
  return state.db;
};
