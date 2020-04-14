const express = require('express');
const app = express();

app.get('/', function (req, res) {
    res.sendFile(`${__dirname}/index.html`);
});
app.use('/src', express.static('src'));
app.listen(3000, function () {
    console.log('app listening :::3000!');
});