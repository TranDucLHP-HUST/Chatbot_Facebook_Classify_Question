# Facebook Chat Bot Application
----
## Requirement
- [NodeJS 10.16.3](https://nodejs.org/download/release/v10.16.3/)
- [ngrok](https://ngrok.com/download)
- [Python 3.7.3](https://www.python.org/downloads/release/python-373/)
- [RabbitMQ](https://www.rabbitmq.com/#getstarted)

## edit config
- please edit config database information and app details in index.js, config.json, middleware/mysqlconnector.js, ManagerChatBox/Database/DatabaManager.cs (view information in mysql in your pc and https://developers.facebook.com/apps/)

- Create database in myQSL with file db_creator.spl in folder Database/ 

## Dependencies
### 1. webhook-server
- socket.io
- nodemon
- express
- mysql
- nconf
- uuid
- request
```bash
npm install --save socket.io
npm install --save nodemon
npm install --save express
npm install --save mysql
npm install --save nconf
npm install --save uuid
npm install --save request
```
### 2. io_server
- socket.io
- nodemon
- express
```bash
npm install --save socket.io
npm install --save nodemon
npm install --save express
```
### 3. ManagerChatBox
- [SocketIOClient](https://github.com/doghappy/socket.io-client-csharp)
- [NewtonSoft.Json](https://www.newtonsoft.com/json)

### 4. PythonNLP
- numpy
- pandas
- sklearnp
```bash
pip install numpy==1.19.3
pip install pandas
pip install scikit-learn
pip install scikit-learn --upgrade
```

<!-- ## start RabbitMQ
cd rabbitmq_server-3.8.9/sbin
rabbitmq-plugins enable rabbitmq_management
open rabbitmq to view in chrome: localhost:15672 -->

## runing python to preprocessing NLP
cd PythonNLP
py main.py

## Running Instruction

```bash
cd webhook-server
npm run start
```

**Enable socket.io server**
```bash
cd io_server
npm run start
```

**Now we need to make application accessible from Internet**
```bash
cd ..
./ngrok authtoken [your_authtoken]
# Get your authtoken at https://dashboard.ngrok.com/get-started/setup (need to sign in)
./ngrok http 14337 # Tunnel with port 14337
```
Read the Forwarding IP (with https protocol) => Add setup webhook url with random string VERIFY_TOKEN.

