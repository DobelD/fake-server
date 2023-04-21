const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')
const cors = require('cors');

const server = jsonServer.create()
const router = jsonServer.router('./database.json')
const userdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'))

server.use(cors())
server.use(bodyParser.urlencoded({ extended: true }))
server.use(bodyParser.json())
server.use(jsonServer.defaults());

const SECRET_KEY = '123456789'

const expiresIn = '1h'

// Create a token from a payload 
function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn })
}

// Verify the token 
function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ? decode : err)
}

// Check if the user exists in database
function isAuthenticated({ email, password }) {
  return userdb.users.findIndex(user => user.email === email && user.password === password) !== -1
}

// Register New User
server.post('/auth/register', (req, res) => {

  const { nama_user, email, telepon, kode_dealer, password } = req.body;

  fs.readFile('./users.json', 'utf-8', (err, data) => {
    if (err) {
      res.status(500).send({ message: 'Server error.' });
      return;
    }

    const users = JSON.parse(data).users;

    const userExist = users.find(user => user.email === email);
    if (userExist) {
      res.status(409).send({ message: 'Email already exists.' });
      return;
    }

    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        res.status(500).send({ message: 'Server error.' });
        return;
      }

      const newUser = {
        id: users.length + 1,
        email,
        password: hash,
        nama_user,
        nama_dealer: '',
        shop: [],
        nama_distributor: '',
        telepon,
        alamat: '',
      };

      if (kode_dealer) {
        const dealerExist = users.find(user => user.id === kode_dealer);
        if (!dealerExist) {
          res.status(404).send({ message: 'Dealer not found.' });
          return;
        }

        newUser.nama_dealer = dealerExist.nama_user;
        dealerExist.shop.push({
          id: dealerExist.shop.length + 1,
          nama_shop: `${newUser.nama_user} Shop`,
        });
      }

      users.push(newUser);

      const updatedData = JSON.stringify({ users });

      fs.writeFile('./users.json', updatedData, err => {
        if (err) {
          res.status(500).send({ message: 'Server error.' });
          return;
        }
        res.status(201).send({ message: 'User created.' });
      });
    });
  });
});




console.log("register endpoint called; request body:");
console.log(req.body);
const { email, password, nama_user, nama_dealer, images, shop, nama_distributor, telepon, alamat } = req.body;

if (isAuthenticated({ email, password }) === true) {
  const status = 401;
  const message = 'Email and Password already exist';
  res.status(status).json({ status, message });
  return;
}

fs.readFile("./users.json", (err, data) => {
  if (err) {
    const status = 401;
    const message = err;
    res.status(status).json({ status, message });
    return;
  }

  // Get current users data
  var data = JSON.parse(data.toString());

  // Get the id of last users
  var last_item_id = data.users[data.users.length - 1].id;

  // Add new user
  data.users.push({ id: last_item_id + 1, email: email, password: password, nama_user: nama_user, nama_dealer: nama_dealer, images: images, shop: shop, nama_distributor: nama_distributor, telepon: telepon, alamat: alamat });

  // Write to file
  var writeData = fs.writeFile("./users.json", JSON.stringify(data), (err, result) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }
  });

  // Create token for new user
  const access_token = createToken({ email, password });

  // Find the user that was just added to the database
  const user = data.users.find((user) => user.email === email && user.password === password);

  // Send the user object and access token in the response
  res.status(200).json({ user, access_token });
});

// Login to one of the users from ./users.json
server.post('/auth/login', (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const { email, password } = req.body;

  if (isAuthenticated({ email, password }) === false) {
    const status = 401;
    const message = 'Incorrect email or password';
    res.status(status).json({ status, message });
    return;
  }

  // Create token for the user
  const access_token = createToken({ email, password });

  // Find the user in the database
  const user = userdb.users.find((user) => user.email === email && user.password === password);

  // Send the user object and access token in the response
  res.status(200).json({ user, access_token });
});


server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Error in authorization format'
    res.status(status).json({ status, message })
    return
  }
  try {
    let verifyTokenResult;
    verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({ status, message })
      return
    }
    next()
  } catch (err) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({ status, message })
  }
})

server.use(router)

server.listen(8080, () => {
  console.log('Run Auth API Server')
})