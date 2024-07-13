require('dotenv').config()
const express = require('express')
const server = express()
const mongoose = require('mongoose')
const cors = require('cors')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto')
const jwt = require('jsonwebtoken');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const cookieParser = require('cookie-parser')

const productsRouter = require('./routes/Products')
const categoriesRouter = require('./routes/Categories')
const brandsRouter = require('./routes/Brands')
const usersRouter = require('./routes/User')
const authRouter = require('./routes/Auth')
const cartRouter = require('./routes/Cart')
const ordersRouter = require('./routes/Order')
const { User } = require('./model/User')
const { isAuth, sanitizeUser, cookieExtractor, sendMail } = require('./services/common')
const path = require('path')
const { Order } = require('./model/Order')


// Webhook


const endpointSecret = process.env.ENDPOINT_SECRET;

server.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    console.log(err.message);
    response.status(201).send(`My Webhook Error: ${err.message}`);
    return;
  }
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});

// JWT options
const opts = {}
opts.jwtFromRequest = cookieExtractor;
opts.secretOrKey = process.env.JWT_SECRET_KEY;


server.use(express.static(path.resolve(__dirname, 'build')))
server.use(cookieParser())
server.use(session({
  secret: process.env.SESSION_KEY,
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
}));

server.use(passport.authenticate('session'));
server.use(cors({
  exposedHeaders: ['X-Total-Count']
}))

//
server.use(express.json())
server.use('/products', isAuth(), productsRouter.router)
server.use('/categories',isAuth(), categoriesRouter.router)
server.use('/brands',isAuth(), brandsRouter.router)
server.use('/users',isAuth(), usersRouter.router)
server.use('/auth', authRouter.router)
server.use('/cart',isAuth(), cartRouter.router)
server.use('/orders',isAuth(), ordersRouter.router)

server.get('*', (req, res) => res.sendFile(path.resolve('build','index.html')))

// Passport Strategies
passport.use('local', new LocalStrategy(
  {usernameField: 'email'},
  async function(email, password, done) {
    // by default passport uses username
    try {
      const user = await User.findOne({email: email});
      console.log(email, password, user);
      if(!user) {
          return done(null, false, {message: "No such email found"})
      }
        crypto.pbkdf2(password, user.salt, 310000, 32, 'sha256', async function(err, hashedPassword) {
          if(!crypto.timingSafeEqual(user.password, hashedPassword)) {  // This method is used to check userPassword with hashedPassword
            return done(null, false, {message: 'Invalid Credentials'});
          }
          const token = jwt.sign(sanitizeUser(user), process.env.JWT_SECRET_KEY);
          done(null, {id: user.id, role: user.role, token})   // This line sends it to serializer
        })
      }
      catch (error) {
        done(error)
      }
  }
));
passport.use('jwt', new JwtStrategy(opts, async function(jwt_payload, done) {
  console.log('jwt',{jwt_payload});
  try {
    // const user = await User.findOne({id: jwt_payload.sub})
    const user = await User.findById(jwt_payload.id)
    if (user) {
      return done(null, sanitizeUser(user));  // This calls serializer
  } else {
      return done(null, false);
      // or you could create a new account
  }
  } catch (error) {
    return done(err, false);
  }
}));


passport.serializeUser(function(user, cb) {
  console.log('serialize ' + user);
  process.nextTick(function() {
    return cb(null, {id: user.id, role: user.role});
  });
});

passport.deserializeUser(function(user, cb) {
  console.log('De-serialize ');
  console.log(user);
  process.nextTick(function() {
    return cb(null, user);
  });
});

// Payments

// This is your test secret API key.
const stripe = require("stripe")(process.env.STRIPE_SERVER_KEY);

server.post("/create-payment-intent", async (req, res) => {
  const { totalAmount, orderId } = req.body;

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount*100,
    currency: "usd",
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      orderId
    }
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});





main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("database is connected");

}




server.listen(process.env.PORT, () => {
    console.log("Server is started on port 8080");
})