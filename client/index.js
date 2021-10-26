const express = require("express");
const app = express();
const fs = require('fs');
const path = require('path');

app.use('/img', express.static('img'));

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(process.env.PORT || 3000)