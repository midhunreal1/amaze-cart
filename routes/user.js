var express = require('express');
var router = express.Router();
const productHelpers= require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');


/* GET home page. */
const verifyLogin = (req, res,next) => {
  if(req.session.LoggedIn){
    next();
  }else{
    res.redirect('/login');
  }
}
router.get('/', async function(req, res, next) {
  let user=req.session.user;
  let cartCount= null;
  if(req.session.user){
    cartCount=await userHelpers.getCartCount(req.session.user._id);
  }

  try {
    const [products, categories] = await Promise.all([
      productHelpers.getAllProducts(),
      productHelpers.getAllCategories()
    ]);
    
    console.log(products);
    res.render('user/view-products',{products, categories, user, cartCount})
  } catch (error) {
    console.error('Error loading data:', error);
    res.render('user/view-products',{products: [], categories: [], user, cartCount})
  }
});
router.get('/login',(req,res)=>{
  if(req.session.user){
    res.redirect('/')
  }
  else{
    res.render('user/login',{
      layout: 'auth-layout', 
      title: 'Login', 
      loginErr: req.session.LoginErr,
      signupSuccess: req.session.signupSuccess
    });
    req.session.LoginErr = false;
    req.session.signupSuccess = false;
  }
})

router.get('/signup',(req,res)=>{
  res.render('user/signup',{layout: 'auth-layout', title: 'Sign Up'})
})
router.post('/signup',(req,res)=>{
  console.log('Signup attempt:', req.body);
  userHelpers.doSignup(req.body).then((newUser)=>{
    console.log('Signup successful:', newUser);
    // Redirect to login page with success message instead of auto-login
    req.session.signupSuccess = 'Account created successfully! Please login to continue.';
    res.redirect('/login');
  }).catch((error) => {
    console.error('Signup failed:', error);
    res.render('user/signup', {
      layout: 'auth-layout', 
      title: 'Sign Up',
      signupErr: 'Registration failed. Please try again.'
    });
  })
})

router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.LoggedIn=true;
      req.session.user=response.user;
      res.redirect('/');
    }else{
      req.session.LoginErr="Invalid username or password."
      res.redirect('/login');
    }
  })
})

router.get('/logout',(req, res) => {
  req.session.user=null;
  req.session.LoggedIn=false;
  res.redirect('/');
})

router.get('/cart',verifyLogin, async(req, res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let totalValue=0;
  if(products.length > 0) {
    totalValue = await userHelpers.getTotalAmount(req.session.user._id)
  }
  console.log(products);
  res.render('user/cart',{products,user:req.session.user,totalValue})
})

router.get('/add-to-cart/:id',(req,res) => {
  console.log("api call")
     userHelpers.addToCart(req.params.id,req.session.user._id).then(() => {
      res.json({status:true})
  })

})

router.post('/change-product-quantity',(req,res)=>{
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
   response.total =await userHelpers.getTotalAmount(req.body.user)
   res.json(response)

  })
})

router.get('/place-order',verifyLogin, async(req,res)=>{
  let total =await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user})
})

router.post('/place-order', async(req, res) => {
  let products = await userHelpers.getCartProductList(req.body.userId);
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId);
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    if (req.body['payment-method'] === 'COD'){
      res.json({codSuccess: true});
     
    } else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response) => {
        res.json(response);
      });
    }
  });
  console.log(req.body);
});


router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})

router.get('/orders', verifyLogin, async(req,res)=>{
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})
})

router.get('/view-order-products/:id', verifyLogin, async(req,res)=>{
  let products = await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})
})

router.post('/verify-payment',(req,res)=>{
  console.log('Verify payment request:', req.body);
  userHelpers.verifyPayment(req.body).then(()=>{
    // Get orderId from order object
    const orderId = req.body.order?.receipt || req.body['order[receipt]'];
    console.log('Order ID for status update:', orderId);

    userHelpers.changePaymentStatus(orderId).then(()=>{
      console.log("payment successful");
      res.json({status:true})
    }).catch((err) => {
      console.error('Error changing payment status:', err);
      res.json({status:false, errMsg: 'Failed to update payment status'});
    })
  }).catch((err)=>{
    console.error('Payment verification error:', err);
    res.json({status:false,errMsg:'Payment verification failed'});
  })
})
router.get('/remove-product/:id', verifyLogin, (req, res) => {
  let proId=req.params.id;
  let userId=req.session.user._id;
  console.log(proId, userId);
  userHelpers.removeProduct(proId, userId).then((response)=>{
    res.json({status: true})
  })
})
module.exports = router;
