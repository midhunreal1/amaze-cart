var express = require('express');
var router = express.Router();
var productHelpers= require('../helpers/product-helpers');
var userHelpers = require('../helpers/user-helpers');

// Admin authentication middleware
const verifyAdmin = (req, res, next) => {
  if (req.session.admin && (req.session.admin.role === 'admin' || req.session.admin.role === 'super_admin')) {
    next();
  } else {
    res.redirect('/admin/login');
  }
}

// Admin login routes
router.get('/login', (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin/login', {layout: 'auth-layout', title: 'Admin Login', loginErr: req.session.adminLoginErr});
    req.session.adminLoginErr = false;
  }
});

router.post('/login', (req, res) => {
  const { Email, Password } = req.body;
  
  userHelpers.doLogin({Email, Password}).then((response) => {
    if (response.status && (response.user.role === 'admin' || response.user.role === 'super_admin')) {
      req.session.admin = {
        _id: response.user._id,
        Name: response.user.Name,
        Email: response.user.Email,
        role: response.user.role
      };
      res.redirect('/admin/dashboard');
    } else {
      req.session.adminLoginErr = 'Invalid admin credentials or insufficient privileges';
      res.redirect('/admin/login');
    }
  }).catch((error) => {
    console.error('Admin login error:', error);
    req.session.adminLoginErr = 'Login failed';
    res.redirect('/admin/login');
  });
});

router.get('/logout', (req, res) => {
  req.session.admin = null;
  res.redirect('/admin/login');
});

// Dashboard route with stats
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const [userCount, productCount, orderCount] = await Promise.all([
      userHelpers.getUserCount(),
      productHelpers.getProductCount(),
      userHelpers.getOrderCount()
    ]);
    
    res.render('admin/dashboard', {
      layout: 'admin-layout',
      title: 'Dashboard',
      currentPage: 'dashboard',
      admin: true,
      stats: {
        users: userCount,
        products: productCount,
        orders: orderCount
      }
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.render('admin/dashboard', {
      layout: 'admin-layout',
      title: 'Dashboard',
      currentPage: 'dashboard',
      admin: true,
      stats: {
        users: 0,
        products: 0,
        orders: 0
      }
    });
  }
});

/* GET admin root - redirect to dashboard */
router.get('/', verifyAdmin, function(req, res, next) {
  res.redirect('/admin/dashboard');
});

// Products route
router.get('/products', verifyAdmin, async function(req, res, next) {
  try {
    const [products, categories] = await Promise.all([
      productHelpers.getAllProducts(),
      productHelpers.getAllCategories()
    ]);
    
    const productsWithIndexes = products.map((product, index) => {
      return { ...product, index: index + 1 };
    });    
    
    res.render('admin/view-products', {
      layout: 'admin-layout',
      title: 'Products Management',
      currentPage: 'products',
      admin: true,
      products: productsWithIndexes,
      categories: categories
    });
  } catch (error) {
    console.error('Error loading products:', error);
    res.render('admin/view-products', {
      layout: 'admin-layout',
      title: 'Products Management',
      currentPage: 'products',
      admin: true,
      products: [],
      categories: []
    });
  }
});
// API endpoint to get product details
router.get('/api/product/:id', verifyAdmin, async (req, res) => {
  try {
    const product = await productHelpers.getProductDetails(req.params.id);
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.get('/add-product', verifyAdmin, (req, res)=>{
  res.render('admin/add-product', {
    layout: 'admin-layout',
    title: 'Add Product',
    currentPage: 'products'
  });
});

router.post('/add-product', verifyAdmin, (req, res)=>{
  productHelpers.addProduct(req.body,(id)=>{
    if (req.files && req.files.Image) {
      let image = req.files.Image;
      image.mv('./public/product-images/'+id+'.jpg',(err)=>{
        if(!err){
          res.status(200).json({ success: true, message: 'Product added successfully' });
        }else{
          console.log(err);
          res.status(500).json({ error: 'Failed to upload image' });
        }
      });
    } else {
      res.status(200).json({ success: true, message: 'Product added successfully' });
    }
  });
});

router.delete('/delete-product/:id', verifyAdmin, (req, res) => {
  let proId=req.params.id;
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response)=>{
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  }).catch((error) => {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  });
});

// Keep the GET route for backward compatibility
router.get('/delete-product/:id', verifyAdmin, (req, res) => {
  let proId=req.params.id;
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin/products')
  })
})

router.get('/edit-product/:id', verifyAdmin, async(req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id);
  console.log(product);
  res.render('admin/edit-product', {
    layout: 'admin-layout',
    title: 'Edit Product',
    currentPage: 'products',
    product: product
  });
});

router.post('/edit-product/:id', verifyAdmin, (req, res) => {
  console.log(req.params.id);
  let id = req.params.id;
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    if (req.files && req.files.Image) {
      let image = req.files.Image;
      image.mv('./public/product-images/' + id + '.jpg', (err) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: 'Failed to upload image' });
        } else {
          res.status(200).json({ success: true, message: 'Product updated successfully' });
        }
      });
    } else {
      res.status(200).json({ success: true, message: 'Product updated successfully' });
    }
  }).catch((error) => {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  });
});

// Users Management Routes
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const users = await userHelpers.getAllUsers();
    // Filter out admin and super_admin users
    const nonAdminUsers = users.filter(user => 
      user.role !== 'admin' && user.role !== 'super_admin'
    );
    const usersWithIndex = nonAdminUsers.map((user, index) => ({
      ...user,
      index: index + 1
    }));
    res.render('admin/view-users', {
      layout: 'admin-layout',
      title: 'Users Management',
      currentPage: 'users',
      admin: true,
      users: usersWithIndex
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.render('admin/view-users', {
      layout: 'admin-layout',
      title: 'Users Management',
      currentPage: 'users',
      admin: true,
      users: []
    });
  }
});

// API endpoint to get user details
router.get('/api/user/:id', verifyAdmin, async (req, res) => {
  try {
    const user = await userHelpers.getUserDetails(req.params.id);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user status
router.post('/api/user/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    await userHelpers.updateUserStatus(req.params.id, isActive);
    res.json({ success: true, message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Orders Management Routes
router.get('/orders', verifyAdmin, async (req, res) => {
  try {
    const orders = await userHelpers.getAllOrders();
    const ordersWithIndex = orders.map((order, index) => ({
      ...order,
      index: index + 1
    }));
    res.render('admin/view-orders', {
      layout: 'admin-layout',
      title: 'Orders Management',
      currentPage: 'orders',
      admin: true,
      orders: ordersWithIndex
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.render('admin/view-orders', {
      layout: 'admin-layout',
      title: 'Orders Management',
      currentPage: 'orders',
      admin: true,
      orders: []
    });
  }
});

// API endpoint to get order details
router.get('/api/order/:id', verifyAdmin, async (req, res) => {
  try {
    const order = await userHelpers.getOrderDetails(req.params.id);
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status
router.post('/api/order/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await userHelpers.updateOrderStatus(req.params.id, status);
    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Categories Management Routes
router.get('/categories', verifyAdmin, async (req, res) => {
  try {
    const categories = await productHelpers.getAllCategories();
    const categoriesWithIndex = categories.map((category, index) => ({
      ...category,
      index: index + 1
    }));
    res.render('admin/view-categories', {
      layout: 'admin-layout',
      title: 'Categories Management',
      currentPage: 'categories',
      admin: true,
      categories: categoriesWithIndex
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.render('admin/view-categories', {
      layout: 'admin-layout',
      title: 'Categories Management',
      currentPage: 'categories',
      admin: true,
      categories: []
    });
  }
});

// Add category
router.post('/add-category', verifyAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const categoryData = await productHelpers.addCategory({ name, description });
    
    // Handle image upload if present
    if (req.files && req.files.image) {
      let image = req.files.image;
      const imagePath = `./public/category-images/${categoryData}.jpg`;
      
      // Create category-images directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(imagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      await image.mv(imagePath);
    }
    
    res.status(200).json({ success: true, message: 'Category added successfully' });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

// Get category details
router.get('/api/category/:id', verifyAdmin, async (req, res) => {
  try {
    const category = await productHelpers.getCategoryDetails(req.params.id);
    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Update category
router.post('/edit-category/:id', verifyAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    await productHelpers.updateCategory(req.params.id, { name, description });
    
    // Handle image upload if present
    if (req.files && req.files.image) {
      let image = req.files.image;
      const imagePath = `./public/category-images/${req.params.id}.jpg`;
      
      // Create category-images directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(imagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      await image.mv(imagePath);
    }
    
    res.status(200).json({ success: true, message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/delete-category/:id', verifyAdmin, async (req, res) => {
  try {
    await productHelpers.deleteCategory(req.params.id);
    
    // Try to delete associated image
    const fs = require('fs');
    const imagePath = `./public/category-images/${req.params.id}.jpg`;
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;