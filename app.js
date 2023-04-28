require('dotenv').config()
const express = require('express')
const app = express()
const { CoreClass } = require('@bot-whatsapp/bot')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const PrincipalCoreClass = require('./PrincipalCoreClass.class')
const QRPortalWeb = require('@bot-whatsapp/portal')
const fs = require('fs');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
const cors = require('cors')
const MongoAdapter = require('@bot-whatsapp/database/mongo')

const corsOptions = {
  origin: '*', // dominio permitido
  methods: ['GET', 'POST', 'PUT'] // métodos HTTP permitidos
};

app.use(cors(corsOptions)); 

const TOKEN_PASSWORD = process.env.TOKEN_PASSWORD

const main = async () => {
  
  const adapterDB = new MongoAdapter({
    dbUri: process.env.MONGO_URI,
    dbName:  process.env.MONGO_DATABASE,
  })
  const adapterProvider = await new BaileysProvider({});

  const bot = new PrincipalCoreClass(adapterDB, adapterProvider);
  const port = process.env.PORT || 3000
  // QRPortalWeb()
 
  
  app.get('/require-scan', function(req, res) {
    res.send(!bot.isReady());
  });

  app.get('/qr', function(req, res) {
    const path = `${process.cwd()}`;
    res.sendFile(path + `/bot.qr.png`);
  });

  app.get('/ping', function (req, res) {
    res.send(true)
  })

  app.post('/send', function (req, res) {

    let token = req.query.token||""
    if(!hasAuthority(token)) return res.send({
      success:false,
      message: "UNAUTHORIZED",
    })
    

    try {

      if(bot.isReady()){
        
        let phone = req.body.phone
        let message = req.body.message
        
        console.log("Send api message to: "+phone)
        console.log(message)

        const patronTelefono = /^[0-9]{12}$/;

        if( phone && message && patronTelefono.test(phone) ){
    
          bot.sendFlowSimple([{ answer: message}], phone);
          res.send(true)
    
        }else{
          res.send(false)
        }
        
      }else{
        res.send(false)
      }

    } catch (error) {
      res.send(false)
    }
      
  })

  const server = app.listen(port, () => {
    
    console.log(`La aplicación está corriendo en el puerto: ${port}`);

  })

  adapterProvider.on('ready', async () => { });

 
}

function hasAuthority(token){
  return !(token != TOKEN_PASSWORD && process.env.APP_MODE == "PROD" && TOKEN_PASSWORD != null)
}

main()