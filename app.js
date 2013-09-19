
var express = require('express');
var app = express();

// log requests
app.use(express.logger('dev'));

// express on its own has no notion
// of a "file". The express.static()
// middleware checks for a file matching
// the `req.path` within the directory
// that you pass it. In this case "GET /js/app.js"
// will look for "./public/js/app.js".

app.use(express.static(__dirname + '/public'));

app.engine('.html', require('ejs').renderFile);

app.get('/', function (req, res) {
    res.render(__dirname + '/index.html');
});
// this examples does not have any routes, however
// you may `app.use(app.router)` before or after these
// static() middleware. If placed before them your routes
// will be matched BEFORE file serving takes place. If placed
// after as shown here then file serving is performed BEFORE
// any routes are hit:
app.use(app.router);

app.listen(3000);
console.log('listening on port 3000');