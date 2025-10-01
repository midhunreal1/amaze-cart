var db = require("../config/connection");
var collection = require("../config/collections");
var { ObjectId } = require("mongodb");
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
      try {
        const database = db.get();
        if (!database) {
          console.log('Database not connected yet');
          return resolve([]); // Return empty array if database not connected
        }
        let products = await database
          .collection(collection.PRODUCT_COLLECTION)
          .find()
          .toArray();
        resolve(products);
      } catch (error) {
        console.error('Error getting products:', error);
        resolve([]); // Return empty array on error
      }
    });
  },
  deleteProduct: (prodId) => {
    return new Promise((resolve, reject) => {
      console.log(prodId);
      console.log(new ObjectId(prodId));
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .removeOne({ _id: new ObjectId(prodId) })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },
  getProductDetails: (prodId) => {
    return new Promise((resolve, reject) => {
      try {
        db.get()
          .collection(collection.PRODUCT_COLLECTION)
          .findOne({ _id: new ObjectId(prodId) })
          .then((product) => {
            if (product) {
              resolve(product);
            } else {
              reject(new Error('Product not found'));
            }
          })
          .catch((error) => {
            console.error('Database error in getProductDetails:', error);
            reject(error);
          });
      } catch (error) {
        console.error('Error in getProductDetails:', error);
        reject(error);
      }
    });
  },
  updateProduct: (proId, proDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: new ObjectId(proId) },
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

  // Category management functions
  getAllCategories: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const database = db.get();
        if (!database) {
          console.log('Database not connected yet');
          return resolve([]);
        }
        let categories = await database
          .collection('categories')
          .find()
          .toArray();
        resolve(categories);
      } catch (error) {
        console.error('Error getting categories:', error);
        resolve([]);
      }
    });
  },

  addCategory: (categoryData) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection('categories')
        .insertOne({
          name: categoryData.name,
          description: categoryData.description,
          createdAt: new Date()
        })
        .then((data) => {
          resolve(data.insertedId);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  getCategoryDetails: (categoryId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection('categories')
        .findOne({ _id: new ObjectId(categoryId) })
        .then((category) => {
          resolve(category);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  updateCategory: (categoryId, categoryData) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection('categories')
        .updateOne(
          { _id: new ObjectId(categoryId) },
          {
            $set: {
              name: categoryData.name,
              description: categoryData.description,
              updatedAt: new Date()
            }
          }
        )
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  deleteCategory: (categoryId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection('categories')
        .deleteOne({ _id: new ObjectId(categoryId) })
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  // Dashboard count function
  getProductCount: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const database = db.get();
        if (!database) {
          return resolve(0);
        }
        
        const count = await database.collection(collection.PRODUCT_COLLECTION)
          .countDocuments({});
        
        resolve(count);
      } catch (error) {
        console.error('Error getting product count:', error);
        resolve(0);
      }
    });
  },
};
