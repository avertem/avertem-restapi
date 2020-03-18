var bodyParser = require('body-parser');
var proxy = require('express-http-proxy');
var express = require('express');
var session = require('express-session');
const fetch = require('node-fetch');
const Bluebird = require('bluebird');
const routes = require('./routes/express');
const helmet = require('helmet');
var bodyParser = require('body-parser');
const bearerToken = require('express-bearer-token');

const { PORT = 3000, ISSUER = `http://localhost:${PORT}` } = process.env;

const app = express();
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bearerToken());

// setup the proxy information
app.use('/query/',proxy(process.env.AVERTEM_SERVER,{
    preserveHostHdr: true,
    parseReqBody: false
  }));

let server;
(async () => {

  routes(app);
  server = app.listen(PORT, () => {
    console.log(`application is listening on port ${PORT}, check its /.well-known/openid-configuration`);
  });
})().catch((err) => {
  if (server && server.listening) server.close();
  console.error(err);
  process.exitCode = 1;
});
