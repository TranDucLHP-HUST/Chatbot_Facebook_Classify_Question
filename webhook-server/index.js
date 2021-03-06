const amqp = require("amqplib/callback_api");
const {
    rejects
} = require("assert");

const mqtt = require("mqtt");
const {
    on
} = require("process");
'use strict';

// Imports dependencies and set up http server
const {
    v4: uuidv4
} = require('uuid');
const
    express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser'),
    nconf = require('nconf'),
    mysql = require('mysql'),
    io = require('socket.io-client'),
    https = require('https'),
    List = require("collections/list"),
    app = express().use(bodyParser.json()); // creates express http server

const mySQLdb = require('./middleware/mysqlconnector');
let curentUnhandledUser = new List();
nconf.argv().env();
nconf.file({
    file: 'config.json'
});

// edit config database information
let conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    port: nconf.get('DATABASE_PORT'),
    database: "chatbotdb"
});
conn.connect(function (err) {
    if (err) throw err;
    console.log("MySQL database connected at port " + nconf.get('DATABASE_PORT') + "!");
});

// For socket.io communication
const socket = io('http://localhost:3000', {
    reconnectionDelayMax: 10000
});
socket.on("owner_answer", (data) => {
    console.log(data);
    // let parseData = JSON.stringify(data);
    console.log(data.responseMess);
    let response = {
        "text": data.responseMess
    };
    callSendAPI(data.senderID, response);
});
// ----------------------------

// Sets server port and logs message on success
app.listen(process.env.PORT || nconf.get('PORT'), () => console.log('webhook is listening at port ' + nconf.get('PORT')));

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {

    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {
            // Gets the message. entry.messaging is an array, but 
            // will only ever contain one message, so we get index 0
            let webhook_event = entry.messaging[0];
            console.log("------------------------------");
            console.log("------------------------------");
            console.log("Receive Message:\n");
            console.log(webhook_event);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                // Get the message info and save it in database
                let messageID = webhook_event.message.mid;
                let sender_psid = webhook_event.sender.id;
                let receiver_psid = webhook_event.recipient.id;
                let messsageTime = webhook_event.timestamp;
                let deliveredTime = entry.time;
                let messageText = webhook_event.message.text;
                mySQLdb.insert(conn, 'chatcontent', messageID, sender_psid, receiver_psid, messsageTime, deliveredTime, messageText);

                handleMessage(sender_psid, receiver_psid, messsageTime, deliveredTime, messageText);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        console.log('404');
        res.sendStatus(404);
    }
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = nconf.get('VERIFY_TOKEN');

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

socket.on("finish_handle", (data) => {
    console.log(data);
    if (curentUnhandledUser.has(data.fininshID))
        curentUnhandledUser.delete(data.fininshID);
    console.log(curentUnhandledUser);
});



// mqtt config and connection
var url = 'mqtt://www.maqiatto.com'
var options = {
    port: 1883,
    username: 'ductrantrung.hust@gmail.com',
    password: '03021999',
};
var topic_ques = 'ductrantrung.hust@gmail.com/question'
var topic_reply = 'ductrantrung.hust@gmail.com/reply'


// Create a client connection
var client = mqtt.connect(url, options);

// publish function, send the question of user to NLP model
function publish_message(msg) {
    let msgJson = {
        payload: msg
    };
    console.log('Publishing...');
    console.log(msgJson);
    // publish a message to a topic
    client.publish(topic_ques, JSON.stringify(msgJson), function () {
        console.log("Message is published");
        // client.end(); // Close the connection when published
    });

}

// subcribe function, after sending the question to NLP model, subcribe to topic reply to receive name class of this question
function subcribe() {
    let text = '';
    console.log('subcribing...');
    // subscribe to a topic
    return new Promise((resolve, reject) => {
        client.subscribe(topic_reply, function () {
            // when a message arrives, do something with it
            client.on('message', function (topic, msg) {
                text = JSON.parse(msg).payload;
               resolve(text);
            });
        });
    })


}


// Handles messages events
function handleMessage(msgSenderID, msgReceiverID, msgTime, readTime, msgText) {
    let response;

    // Check if the message contains text
    if (msgText) {
        publish_message(msgText);
        subcribe().then(rs => {
            response = {
                "text": rs
            }
            callSendAPI(msgSenderID, response);
        }, err => {
            console.log("Error ", err);
        });

    }
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API, save the data to database
function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    request({
            "uri": "https://graph.facebook.com/v2.6/me/messages",
            // "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
            "qs": {
                "access_token": nconf.get("PAGE_ACCESS_TOKEN")
            },
            "method": "POST",
            "json": request_body
        },
        (err, res, body) => {
            if (!err) {
                console.log('message sent!');
            } else {
                console.error("Unable to send message:" + err);
            }
        }
    );
    mySQLdb.insert(conn, 'chatcontent', "m_" + uuidv4() + uuidv4(), nconf.get('PAGE_ID'), sender_psid, new Date(Date.now() + 1000), new Date(Date.now() + 1000), response.text);
}