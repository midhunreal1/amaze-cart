var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
var hbs = require('express-handlebars');  
var app = express();
var fileUpload= require('express-fileupload');
var db = require('./config/connection');
var session = require('express-session');
var nocache = require('nocache')
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs',hbs.engine({
  extname:'hbs',
  defaultLayout:'layout',
  layoutDir:path.join(__dirname,'views','layouts'),
  partialsDir:path.join(__dirname,'views','partials'),
  helpers: {
    ifEquals: function(arg1, arg2, options) {
      if (arguments.length < 3) {
        throw new Error("ifEquals helper needs 2 parameters");
      }
      if (options.fn && typeof options.fn === 'function') {
        return (arg1 == arg2) ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
      }
      return '';
    },
    eq: function(arg1, arg2) {
      return arg1 === arg2;
    },
    truncate: function(str, len) {
      if (str && str.length > len) {
        return str.substring(0, len) + '...';
      }
      return str;
    },
    formatDate: function(date) {
      if (!date) return '';
      const d = new Date(date);
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return d.toLocaleDateString('en-IN', options);
    },
    formatPrice: function(price) {
      return '₹' + price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    multiply: function(a, b) {
      return a * b;
    },
    json: function(context) {
      return JSON.stringify(context);
    }
  }
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(session({
  secret:"Key",
  cookie:{maxAge:600000},
  resave: false,
  saveUninitialized: false
}))
app.use(nocache())

// Register routes
app.use('/', userRouter);
app.use('/admin', adminRouter);

// Connect to database
db.connect((err)=>{
  if(err) {
    console.log("Connect error: " + err)
    console.log("Retrying database connection in 5 seconds...")
    setTimeout(() => {
      db.connect((retryErr) => {
        if(retryErr) {
          console.log("Retry failed: " + retryErr)
          process.exit(1);
        } else {
          console.log("Connect success on retry")
        }
      })
    }, 5000);
  } else {
    console.log("Connect success")
  }
})

//catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
//error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;