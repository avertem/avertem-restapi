const { strict: assert } = require('assert');
const querystring = require('querystring');
const { inspect } = require('util');

var dotenv = require('dotenv');
var protobuf = require("protobufjs");
var read = require('file-reader');
var read = require('read-file');
var crypto = require('crypto');
var Buffer = require('buffer/').Buffer
const NodeRSA = require('node-rsa');
const fetch = require("node-fetch");
var sha256 = require('js-sha256').sha256;

import { AvertemKey, AvertemStore, AvertemModel, AvertemTransaction }  from 'avertem-js-utils';

console.log("Account %o",process.env.AVERTEM_ACCOUNT)
let clientHash = Buffer.from(process.env.AVERTEM_ACCOUNT, 'hex');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// the avertem token
if (!process.env.AVERTEM_TOKEN) {
    process.env.AVERTEM_TOKEN = "test";
}

// the avertem token
if (!process.env.AVERTEM_INITIAL_ACCOUNT_VALUE) {
    process.env.AVERTEM_INITIAL_ACCOUNT_VALUE = 1000;
}


module.exports = (app) => {
    console.log("Start of the router")

    app.use((req, res, next) => {
      const orig = res.render;
      // you'll probably want to use a full blown render engine capable of layouts
      res.render = (view, locals) => {
        app.render(view, locals, (err, html) => {
          if (err) throw err;
          orig.call(res, '_layout', {
            ...locals,
            body: html,
          });
        });
      };
      next();
    });
  
    function setNoCache(req, res, next) {
      res.set('Pragma', 'no-cache');
      res.set('Cache-Control', 'no-cache, no-store');
      next();
    };

    const keyLoader = function() {
        let keyFile = read.sync(process.env.AVERTEM_KEY);
        console.log(`KEY = \n${keyFile}`)
        let key = new NodeRSA(keyFile,{"signingScheme":"pkcs1-sha256"})
        return key;
    }

    const authenticate = async function() {
        try {
            
            let hash = sha256.create();
            hash.update('Message2 to hash');
            let hashBuffer = new Buffer(hash.arrayBuffer())
            let hashHex = hashBuffer.toString("hex");
            let signature = keyLoader().sign(hashHex,"buffer","hex");
            let signatureHex = signature.toString("hex");

            let authenticateSession = await fetch(process.env.AVERTEM_SERVER + "/authenticate/" + process.env.AVERTEM_ACCOUNT + "/" + hashHex + "/" + signatureHex,{
                method: 'get',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',                  
                }});
            //console.log("The result of the query is [%o]",authenticateSession);
            let result = await authenticateSession.json();
            return result.session;
        } catch(error) {
            console.log(`Failed to authenticate [${error}]`);
            throw error;
        }
    }

    const createAccount = async function(transaction,session) {
        try {
            let result = await fetch(`${process.env.AVERTEM_SERVER}/transaction/${session}`, {
                method: 'POST',
                body: transaction.getProtoTransBuffer(),
                headers: { 
                    'Content-Type': 'application/protobuf',
                    'session_hash': session},
                rejectUnauthorized: false
            });
            console.log("The result is [%o]",result);
        } catch (error) {
            console.log(`Failed to create the account [${error}]`);
            throw error;
        }
    }
  
    app.post('/account/create', setNoCache, async (req, res, next) => {
        console.log("The account create")
        console.log("The body [%o]",req.body);
        console.log("The token [%o]",req.token);
        console.log("The token [%o]",process.env.AVERTEM_TOKEN);
        console.log("The token [%o]",process.env.AVERTEM_ACCOUNT);

        if (process.env.AVERTEM_TOKEN != req.token) {
            res.status(401);
            return res.end('Invalid token');
        }

        let account = req.body.account.toUpperCase();

        let session = await authenticate();

        console.log("The session id is [%o] account [%o]",session,account);


        let transaction = new AvertemTransaction(keyLoader(),process.env.AVERTEM_INITIAL_ACCOUNT_VALUE,account,
            process.env.AVERTEM_ACCOUNT,account, {
                contract: 'DEA8E695ECDD055EF0820342AA65E7D2BCB34EAE1D29D8E060BC14262968A8B5',
                contractName: 'account_management_contract',
                model:{subjects :[
                    {
                        subject: `http://keto-coin.io/schema/rdf/1.0/keto/Account#Account/${account}`,
                        predicates: [
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/Account#id',
                                objects:[{
                                    value: account,
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            },
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/Account#hash',
                                objects:[{
                                    value: account,
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            },
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/Account#name',
                                objects:[{
                                    value: req.body.user,
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            },
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/Account#email',
                                objects:[{
                                    value: req.body.email,
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            },
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/Account#email_verified',
                                objects:[{
                                    value: req.body.email_verified.toString(),
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            },
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/Account#firstname',
                                objects:[{
                                    value: req.body.firstname,
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            },
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/Account#lastname',
                                objects:[{
                                    value: req.body.lastname,
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            },
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/Account#public_key',
                                objects:[{
                                    value: req.body.accountKey,
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            },
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/Account#type',
                                objects:[{
                                    value: req.body.account_type,
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            },
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/Account#status',
                                objects:[{
                                    value: 'create',
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            },
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/Account#parent',
                                objects:[{
                                    value: process.env.AVERTEM_ACCOUNT,
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        subject: `http://keto-coin.io/schema/rdf/1.0/keto/AccountGroup#AccountGroup/${account}`,
                        predicates: [
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/AccountGroup#id',
                                objects:[{
                                    value: account,
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            },
                            {
                                predicate: 'http://keto-coin.io/schema/rdf/1.0/keto/AccountGroup#account',
                                objects:[{
                                    value: `http://keto-coin.io/schema/rdf/1.0/keto/Account#Account/${account}`,
                                    type: 'uri',
                                    dataType: 'http://www.w3.org/2001/XMLSchema#string'
                                    }
                                ]
                            }
                        ]
                    }
                ]}
            });

        createAccount(transaction,session);

        return res.end(JSON.stringify({
            created: true,
            account_id: req.body.account
          }));
    });

    app.use((err, req, res, next) => {
        if (err instanceof SessionNotFound) {
            // handle interaction expired / session not found error
        }
        next(err);
    });
};


