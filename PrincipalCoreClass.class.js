const  {CoreClass} = require("@bot-whatsapp/bot");
const express = require('express')
var request = require('request');
const axios = require('axios');


const app = express()

const readline = require('readline');
var redis = require("redis");

const { MongoClient, ServerApiVersion } = require('mongodb');
const { Console } = require("console");
const ObjectID = require('mongodb').ObjectID;
var isReady = false;
//Mongo DB

const DATABASE = process.env.MONGO_DATABASE || "GptSergio" 
const uriMongo = process.env.MONGO_URI;
const IA_HOTS = process.env.IA_HOTS

const Mongoclient = new MongoClient(uriMongo, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
var BotsCollection = null
var ConfigCollection = null

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

        console.log(from)
        console.log(body)

        let FromBody = {
            "token":"1224",
            // "bot":"nutria",
            "phone":from,
            "message":body,
            "purge":false
        }

        if(body.toLowerCase() == 'clear'){
            
           await this.sendIAMessageToApi(IA_HOTS,FromBody,'purge')
           return this.sendFlowSimple([{answer: "Contexto Limpio."}], from);

        }else{
          let reply = await this.sendIAMessageToApi(IA_HOTS,FromBody)
          if(reply.success){
              console.log(reply.data.message)
            return this.sendFlowSimple([{answer: reply.data.message.trim()}],from );
          }else{

            return this.sendFlowSimple([{answer: "Lo siento 😥, ocurrio un error con el servidor, intenta mas tarde"}], from);

          }

        }




        

    };

    async sendIAMessageToApi(host, body,action = 'send') {

        console.log(action)
        try {
          const response = await axios.post(`${host}/${action}`, body);
        //   console.log(response.data)
          return response.data;
      
        } catch (error) {
          // throw error;
        }
      }
    
    
    
    
}




module.exports = PrincipalCoreClass;