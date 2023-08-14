var db = require("../config/connection");
var collection = require("../config/collections");
var objectId = require("mongodb").ObjectID;
const bcrypt = require('bcrypt')

module.exports = {
  addProduct: (product, callback) => {
    console.log(product);
    db.get()
      .collection("product")
      .insertOne(product)
      .then((data) => {
        callback(data.insertedId);
      });
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .toArray();
      resolve(products);
    });
  },
  deleteProduct: (prodId) => {
    return new Promise((resolve, reject) => {
      console.log(prodId);
      console.log(objectId(prodId));
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .removeOne({ _id: objectId(prodId) })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },
  getProductDetails: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(prodId) })
        .then((product) => {
          resolve(product);
        });
    });
  },
  updateProduct: (proId, proDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: objectId(proId) },
          {
            $set: {
              Name: proDetails.Name,
              Description: proDetails.Description,
              Price: proDetails.Price,
              Category: proDetails.Category,
            },
          }
        )
        .then((response) => {
          resolve();
        })
        .catch((error) => {
          reject(error); // Handle the error and reject the promise
        });
    });
  },
};
