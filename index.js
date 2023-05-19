
require('dotenv').config();


const PORT = 3000;

const express =  require('express');
const server = express();
const morgan = require('morgan');

const { client } = require('./db');
client.connect();

const apiRouter = require('./api');

server.use(morgan('dev'));
server.use(express.json())
server.use('/api', apiRouter);


server.use((req, res, next) => {
    console.log("<____Body Logger START____>");
    console.log(req.body);
    console.log("<_____Body Logger END_____>");

    next();
})

server.listen(PORT, () => {
    console.log('the server is up on port ', PORT);
})

