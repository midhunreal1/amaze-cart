var db=require('../config/connection')
var collection =require('../config/collections')
const bcrypt = require('bcrypt')
var { ObjectId } = require('mongodb')
const Razorpay= require('razorpay')
var instance = new Razorpay({
  key_id: 'rzp_test_4z1dCRspybjEPz',
  key_secret: 'oRuNi1FZR3G7gYsOmUlUmr0k',
});
module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve, reject) =>{
        try {
            const database = db.get();
            if (!database) {
                console.log('Database not connected for signup');
                return reject(new Error('Database not connected'));
            }
            
            // Check if user already exists
            const existingUser = await database.collection(collection.USER_COLLECTION)
                .findOne({Email: userData.Email});
            
            if (existingUser) {
                return reject(new Error('User already exists'));
            }
            
            userData.Password = await bcrypt.hash(userData.Password, 10);
            userData.role = 'user'; // Default role for regular users
            userData.createdAt = new Date();
            userData.isActive = true;
            
            const result = await database.collection(collection.USER_COLLECTION).insertOne(userData);
            
            // Return the complete user object with the new ID
            const newUser = {
                _id: result.insertedId,
                Name: userData.Name,
                Email: userData.Email,
                role: userData.role
            };
            console.log('User created successfully:', newUser);
            resolve(newUser);
        } catch (error) {
            console.error('Signup error:', error);
            reject(error);
        }
        })
    },
    doLogin:(userData) =>{
                return new Promise(async(resolve,reject) =>{
                try {
                    const database = db.get();
                    if (!database) {
                        console.log('Database not connected for login');
                        return resolve({status: false});
                    }
                    
                    let response = {}
                    let user = await database.collection(collection.USER_COLLECTION)
                        .findOne({Email: userData.Email, isActive: true});
                 
                 if (user){
                    const passwordMatch = await bcrypt.compare(userData.Password, user.Password);
                    
                    if(passwordMatch){
                        console.log("Login success for:", userData.Email);
                        response.user = {
                            _id: user._id,
                            Name: user.Name,
                            Email: user.Email,
                            role: user.role
                        };
                        response.status = true;
                        resolve(response);
                    }else{
                        console.log("Login failure - incorrect password");
                        resolve({status:false});
                    }
                 }else{
                    console.log("Login failure - user not found or inactive");
                    resolve({status:false});
                 }
                } catch (error) {
                    console.error('Login error:', error);
                    resolve({status: false});
                }
                })
    },
    
    createAdminUser: (adminData) => {
        return new Promise(async(resolve, reject) => {
            try {
                const database = db.get();
                if (!database) {
                    return reject(new Error('Database not connected'));
                }
                
                // Check if admin already exists
                const existingAdmin = await database.collection(collection.USER_COLLECTION)
                    .findOne({Email: adminData.Email});
                
                if (existingAdmin) {
                    return reject(new Error('Admin user already exists'));
                }
                
                adminData.Password = await bcrypt.hash(adminData.Password, 10);
                adminData.role = 'admin';
                adminData.createdAt = new Date();
                adminData.isActive = true;
                
                const result = await database.collection(collection.USER_COLLECTION).insertOne(adminData);
                
                const newAdmin = {
                    _id: result.insertedId,
                    Name: adminData.Name,
                    Email: adminData.Email,
                    role: adminData.role
                };
                
                console.log('Admin user created successfully:', newAdmin);
                resolve(newAdmin);
            } catch (error) {
                console.error('Admin creation error:', error);
                reject(error);
            }
        });
    },
   

    addToCart: (proId,userId) => {
        let proObj={
            item:new ObjectId(proId),
            quantity:1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user:new ObjectId(userId) });
            if (userCart) {
                let proExist=userCart.products.findIndex(product => product.item==proId)
                console.log(proExist);
                if(proExist!=-1) {
                    db.get().collection(collection.CART_COLLECTION).
                    updateOne({'products.item':new ObjectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }.then(()=>{resolve()})
                    )
                }else{
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:new ObjectId(userId)},
                    {
                        $push:{products:proObj}
                        
                    }).then((response)=>{
                        resolve()
                    })
                }
   
            }else {
                let cartObj = {
                    user: new ObjectId(userId),
                    products: [proObj]
                };
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve();
                    
                }); 
            }
        });
       
    },
    removeProduct: (prodId, userId) => {
      return new Promise((resolve, reject) => {
        console.log(prodId);
        console.log(new ObjectId(prodId));
        db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
                { user: new ObjectId(userId) },
                {
                    $pull: {
                        products: {
                            item: new ObjectId(prodId),
                        },
                    },
                }
            )
            .then((response) => {
                console.log(response);
                resolve(response);
            });
    });
    },
    
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
          let cartItems = await db
            .get()
            .collection(collection.CART_COLLECTION)
            .aggregate([
              {
                $match: { user: new ObjectId(userId) },
              },
              {
                $unwind: '$products'
              },
              {
                $project: {
                  productId: '$products.item', 
                  quantity: '$products.quantity'
                }
              },
              {
                $lookup: {
                  from: collection.PRODUCT_COLLECTION,
                  localField: 'productId', 
                  foreignField: '_id', 
                  as: 'product'
                }
              },
              {
                $project:{
                    productId:1,
                    quantity:1,
                    product:{$arrayElemAt:['$product',0]}
                }
              }
            ]).toArray();
      
          resolve(cartItems);
        });
      },
      
      getCartCount: (userId) => {
        return new Promise(async(resolve, reject) => {
            let count=0;
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
            if (cart) {
                count = cart.products.length;
            }
            resolve(count);
        });
    },
    changeProductQuantity:(details)=>{
        details.count=parseInt(details.count)
        details.quantity=parseInt(details.quantity)
       
        return new Promise((resolve, reject) =>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:new ObjectId(details.cart)},
                {
                    $pull:{products:{item:new ObjectId(details.product)}}
                }).then((response)=>{
                    resolve({removeProduct:true})
                })

            }
            else{
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:new ObjectId(details.cart),'products.item':new ObjectId(details.product)},
                {
                    $inc:{'products.$.quantity':details.count}
                }).then((response)=>{
                    resolve({status:true})
                })
            }
   
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async (resolve, reject) => {
            let total = await db
              .get()
              .collection(collection.CART_COLLECTION)
              .aggregate([
                {
                  $match: { user: new ObjectId(userId) },
                },
                {
                  $unwind: '$products'
                },
                {
                  $project: {
                    productId: '$products.item', 
                    quantity: '$products.quantity'
                  }
                },
                {
                  $lookup: {
                    from: collection.PRODUCT_COLLECTION,
                    localField: 'productId', 
                    foreignField: '_id', 
                    as: 'product'
                  }
                },
                {
                    $project: {
                      productId: 1,
                      quantity: 1,
                      product: {
                        $arrayElemAt: ['$product', 0]
                      },
                      priceNumeric: {
                        $map: {
                          input: '$product.Price',
                          as: 'price',
                          in: { $toInt: '$$price' }
                        }
                      }
                    }
                  },
                  {
                    $project: {
                      productId: 1,
                      quantity: 1,
                      product: 1,
                      priceNumeric: {
                        $reduce: {
                          input: '$priceNumeric',
                          initialValue: 0,
                          in: { $add: ['$$value', '$$this'] }
                        }
                      }
                    }
                  },
                  {
                    $group: {
                      _id: null,
                      total: {
                        $sum: {
                          $multiply: ['$quantity', '$priceNumeric']
                        }
                      }
                    }
                  }
                  
              ]).toArray();
              if (total[0].total) {
                console.log(total[0].total);
                resolve(total[0].total);
              } else {
                
                resolve(0);
              }
          });
        
    },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve, reject)=>{
            console.log(order,products,total);
            let status= order['payment-method']==='COD'?'placed':'pending'
            let orderObj= {
                deliveryDetails:{
                    mobile:order.mobile,
                    address:order.address,
                    pincode:order.pincode
                },
                userId:new ObjectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                totalAmount:total,
                status:status,
                date:new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:new ObjectId(order.userId)})
                resolve(response.insertedId)
            }).catch((err) => {
                console.error('Error placing order:', err);
                reject(err);
            })
        })
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve, reject)=>{
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:new ObjectId(userId)})
            console.log(cart)
            resolve(cart.products)
        })
    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            console.log(userId)
            let orders= await db.get().collection(collection.ORDER_COLLECTION).find({userId:new ObjectId(userId)}).toArray()
            console.log(orders)
            resolve(orders)
        })
    },
    getOrderProducts:(orderId)=>{
      return new Promise(async (resolve, reject) => {
        let orderItems = await db.get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: { _id: new ObjectId(orderId) },
            },
            {
              $unwind: '$products'
            },
            {
              $project: {
                productId: '$products.item', 
                quantity: '$products.quantity'
              }
            },
            {
              $lookup: {
                from: collection.PRODUCT_COLLECTION,
                localField: 'productId',
                foreignField: '_id',
                as: 'product'
              }
            },
            {
              $project:{
                  productId:1,
                  quantity:1,
                  product:{$arrayElemAt:['$product',0]}
              }
            }
          ]).toArray();
    
        resolve(orderItems);
      });
    },
    generateRazorpay:(orderId,total)=>{
      return new Promise((resolve, reject) => {
        var options={
          amount:total*100,
          currency:"INR",
          receipt:""+orderId
        };
        instance.orders.create(options,function(err,order){
          if(err)  {
            console.log(err);
          }else{
            console.log("New order :",order);
            resolve(order) 
          }
        })
      })
    },
    verifyPayment: (details) => {
      return new Promise((resolve, reject) => {
        const crypto = require('crypto');
        let hmac = crypto.createHmac('sha256', 'oRuNi1FZR3G7gYsOmUlUmr0k');

        // Handle both nested and flat payment object structures
        const orderId = details.payment?.razorpay_order_id || details['payment[razorpay_order_id]'];
        const paymentId = details.payment?.razorpay_payment_id || details['payment[razorpay_payment_id]'];
        const signature = details.payment?.razorpay_signature || details['payment[razorpay_signature]'];

        hmac.update(orderId + '|' + paymentId);
        const calculatedSignature = hmac.digest('hex');

        console.log('Payment verification:', {orderId, paymentId, signature, calculatedSignature});

        if (calculatedSignature === signature) {
          resolve();
        } else {
          reject(new Error('Signature verification failed'));
        }
      });
    },
    
    changePaymentStatus:(orderId)=>{
      return new Promise((resolve, reject)=>{
        db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:new ObjectId(orderId)},
        {
          $set:{
            status:'placed'
          }
        }).then(()=>{
          resolve()
        })
      })
    },

    // Admin Helper Functions
    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const database = db.get();
                if (!database) {
                    return reject(new Error('Database not connected'));
                }
                
                const users = await database.collection(collection.USER_COLLECTION)
                    .find({ role: { $ne: 'admin' } }) // Exclude admin users
                    .sort({ createdAt: -1 })
                    .toArray();
                
                resolve(users);
            } catch (error) {
                console.error('Error fetching users:', error);
                reject(error);
            }
        });
    },

    getUserDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const database = db.get();
                if (!database) {
                    return reject(new Error('Database not connected'));
                }
                
                const user = await database.collection(collection.USER_COLLECTION)
                    .findOne({ _id: new ObjectId(userId) });
                
                if (user) {
                    resolve(user);
                } else {
                    reject(new Error('User not found'));
                }
            } catch (error) {
                console.error('Error fetching user details:', error);
                reject(error);
            }
        });
    },

    updateUserStatus: (userId, isActive) => {
        return new Promise(async (resolve, reject) => {
            try {
                const database = db.get();
                if (!database) {
                    return reject(new Error('Database not connected'));
                }
                
                await database.collection(collection.USER_COLLECTION)
                    .updateOne(
                        { _id: new ObjectId(userId) },
                        { $set: { isActive: isActive } }
                    );
                
                resolve();
            } catch (error) {
                console.error('Error updating user status:', error);
                reject(error);
            }
        });
    },

    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const database = db.get();
                if (!database) {
                    return reject(new Error('Database not connected'));
                }
                
                const orders = await database.collection(collection.ORDER_COLLECTION)
                    .aggregate([
                        {
                            $lookup: {
                                from: collection.USER_COLLECTION,
                                localField: 'userId',
                                foreignField: '_id',
                                as: 'user'
                            }
                        },
                        {
                            $unwind: '$user'
                        },
                        {
                            $lookup: {
                                from: collection.PRODUCT_COLLECTION,
                                localField: 'products.item',
                                foreignField: '_id',
                                as: 'productDetails'
                            }
                        },
                        {
                            $sort: { date: -1 }
                        }
                    ]).toArray();
                
                resolve(orders);
            } catch (error) {
                console.error('Error fetching orders:', error);
                reject(error);
            }
        });
    },

    getOrderDetails: (orderId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const database = db.get();
                if (!database) {
                    return reject(new Error('Database not connected'));
                }
                
                const order = await database.collection(collection.ORDER_COLLECTION)
                    .aggregate([
                        {
                            $match: { _id: new ObjectId(orderId) }
                        },
                        {
                            $lookup: {
                                from: collection.USER_COLLECTION,
                                localField: 'userId',
                                foreignField: '_id',
                                as: 'user'
                            }
                        },
                        {
                            $unwind: '$user'
                        },
                        {
                            $unwind: '$products'
                        },
                        {
                            $lookup: {
                                from: collection.PRODUCT_COLLECTION,
                                localField: 'products.item',
                                foreignField: '_id',
                                as: 'products.item'
                            }
                        },
                        {
                            $unwind: '$products.item'
                        },
                        {
                            $group: {
                                _id: '$_id',
                                userId: { $first: '$userId' },
                                deliveryDetails: { $first: '$deliveryDetails' },
                                products: { $push: '$products' },
                                totalAmount: { $first: '$totalAmount' },
                                status: { $first: '$status' },
                                paymentMethod: { $first: '$paymentMethod' },
                                date: { $first: '$date' },
                                user: { $first: '$user' }
                            }
                        }
                    ]).toArray();
                
                if (order && order.length > 0) {
                    resolve(order[0]);
                } else {
                    reject(new Error('Order not found'));
                }
            } catch (error) {
                console.error('Error fetching order details:', error);
                reject(error);
            }
        });
    },

    updateOrderStatus: (orderId, status) => {
        return new Promise(async (resolve, reject) => {
            try {
                const database = db.get();
                if (!database) {
                    return reject(new Error('Database not connected'));
                }
                
                await database.collection(collection.ORDER_COLLECTION)
                    .updateOne(
                        { _id: new ObjectId(orderId) },
                        { $set: { status: status } }
                    );
                
                resolve();
            } catch (error) {
                console.error('Error updating order status:', error);
                reject(error);
            }
        });
    },

    // Dashboard count functions
    getUserCount: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const database = db.get();
                if (!database) {
                    return resolve(0);
                }
                
                const count = await database.collection(collection.USER_COLLECTION)
                    .countDocuments({ role: { $ne: 'admin' } });
                
                resolve(count);
            } catch (error) {
                console.error('Error getting user count:', error);
                resolve(0);
            }
        });
    },

    getOrderCount: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const database = db.get();
                if (!database) {
                    return resolve(0);
                }
                
                const count = await database.collection(collection.ORDER_COLLECTION)
                    .countDocuments({});
                
                resolve(count);
            } catch (error) {
                console.error('Error getting order count:', error);
                resolve(0);
            }
        });
    }
}