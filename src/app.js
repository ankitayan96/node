const express = require('express');
const { getUsersWithPostCount } = require('./controllers/user.controller');

const app = express();

app.set('json spaces', 2); // added this to pretty-print json response in browser

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/users', getUsersWithPostCount);

module.exports = app;