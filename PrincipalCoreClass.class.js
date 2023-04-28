const  {CoreClass} = require("@bot-whatsapp/bot");
const express = require('express')
var request = require('request');
const axios = require('axios');


const app = express()

const readline = require('readline');
var redis = require("redis");

const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectID = require('mongodb').ObjectID;
var isReady = false;
//Mongo DB

const DATABASE = process.env.MONGO_DATABASE || "GptSergio" 
const uriMongo = process.env.MONGO_URI;
const IA_HOTS = process.env.IA_HOTS

const Mongoclient = new MongoClient(uriMongo, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
var BotsCollection = null
var ConfigCollection = null
var UsersCollection = null

//Redis
// var Redisclient = redis.createClient( process.env.REDIS_PORT, process.env.REDIS_URI,{no_ready_check: true}); 

class PrincipalCoreClass extends CoreClass {

    constructor  (_database, _provider) {

        console.log("PrincipalCoreClass")
        super (null, _database, _provider);

        this.providerClass.on('ready', () => {
            this.handleReadyEvent();
            isReady = true;
            console.log("ready")
        });

        this.providerClass.on('require_action', async () => {
            isReady = false;
        })
      
    }

    isReady = () => {

      return isReady
    
    }

    handleReadyEvent() {

        Mongoclient.connect( async err => {

            BotsCollection = Mongoclient.db(DATABASE).collection("Bots");
            ConfigCollection = Mongoclient.db(DATABASE).collection("Config");
            UsersCollection = Mongoclient.db(DATABASE).collection("Users");

            if(err){ console.log(err) } else {
                this.ready = true
            }
            
            console.log("Mongo Conectado a: "+DATABASE);
        });

       
    }

    handleMsg = async (ctx) =>  {

        const { from, body } = ctx;

        console.log(body)

        if(!body){
            return;
        }

        if(body.includes("_event_") || body.trim() === ""){
          console.log("unanswered")
          return;
        }

       let user = await this.searchOrCreateUserByPhone(from)

        console.log(from)
        console.log(body)

        let FromBody = {
            "token":"1224",
            "phone":from,
            "message":body,
            "purge":false,
            "bot":user.bot||"a2",
            "poeToken":user.poeToken||null,
        }

        let iscommandVar = await this.isCommand( body.toLowerCase(), from, FromBody)
        console.log(iscommandVar)
        if(! iscommandVar){
          let reply = await this.sendIAMessageToApi(IA_HOTS,FromBody)
          if(reply.success){
              console.log(reply.data.message)
            return this.sendFlowSimple([{answer: reply.data.message.trim()}],from );
          }else{
            return this.sendFlowSimple([{answer: "Una pregunta a la vez ✋"}], from);

          }
        }




        

    };

    async sendIAMessageToApi(host, body,action = 'send') {

        console.log(action)

        try {
          const response = await axios.post(`${host}/${action}`, body);

          return response.data;
      
        } catch (error) {
          // throw error;
        }
    }

    async isCommand(body,from,FromBody) {

      let comando = false;

      console.log(body.charAt(0))

      if( body.charAt(0) == "/" ){

        let command = body.split("=")

        console.log(command)

        switch ( command[0] ) {
          case "/bot":
  
            if(command[1] != null){

              await this.editUser(from, {
                bot:command[1]
              });
              this.sendFlowSimple([{answer: "Bot switched."}], from);
              comando = true 
            
            }
            
            break;

          case "/token":
  
            if(command[1] != null){

              await this.editUser(from, {
                poeToken:command[1]
              });

              this.sendFlowSimple([{answer: "Token replaced."}], from);
              comando = true 
            
            }
            
            break;

          case "/bots":
  

            let reply = await this.sendIAMessageToApi(IA_HOTS,FromBody,'bot-list')

            let bots = "";
            let originalObj = reply.data.message
            let invertedObj = {}
            for (const key in originalObj) {
              invertedObj[originalObj[key]] = key;
              bots += `${originalObj[key]} = ${key}\n`
            }


            this.sendFlowSimple([{answer: bots}], from);
            comando = true 

            
            break;
 
          case "/clear":

            await this.sendIAMessageToApi(IA_HOTS,FromBody,'purge')
            this.sendFlowSimple([{answer: "Context clean."}], from);
            comando = true 

          break;
      
          default:
            break;
        }

        return comando

      }

      return comando
      
        
    }

    async editUser(phone, updateData) {
      const user = await UsersCollection.findOne({ phone });
      if (user) {
      await UsersCollection.updateOne({ phone }, { $set: updateData });
      }
    }

      
    async searchOrCreateUserByPhone(phone) {
      const user = await UsersCollection.findOne({ phone });
      if (!user) {
      const newUser = {
      phone
      };
      await UsersCollection.insertOne(newUser);
      return await UsersCollection.findOne({ phone });
      }
      return user;
    }
    
    
    
    
}






module.exports = PrincipalCoreClass;