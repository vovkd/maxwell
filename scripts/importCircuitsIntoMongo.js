let glob = require("glob");
let MongoClient = require('mongodb').MongoClient;
let assert = require("assert");
let fs = require("fs");
let path = require('path');

var url = 'mongodb://localhost:27017/maxwell';

let circuit_names = glob.sync(__dirname + "/../circuits/v5/*.json");

MongoClient.connect(url, function (err, db) {
//   assert.equal(null, err);
  console.log("Connected correctly to server");

  circuits = [];

  for (let circuit_path of circuit_names) {
    console.log(circuit_path);

    let circuit_data = JSON.parse(fs.readFileSync(circuit_path));
    let name = path.basename(circuit_path, '.json');

    circuits.push({
      name,
      params: circuit_data.params,
      components: circuit_data.components
    });
  }

  db.collection('circuits').insertMany(circuits, function (err, r) {

    console.log("Inserted", r.insertedCount, "circuits");

    db.close();
  });
});
