const express = require('express');
const history = require('connect-history-api-fallback');
const https = require('https');
const http = require('http');
const fs = require('fs');
const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;

const staticFileMiddleware = express.static(__dirname + '/www/dist/');
app.use(staticFileMiddleware);
app.use(history({
    disableDotRule: true,
    verbose: true
}));
app.use(staticFileMiddleware);
app.use(express.json());
app.use(express.urlencoded());

const httpServer = http.createServer(app);
const httpsServer = https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/www.teachertoolbox.tk/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/www.teachertoolbox.tk/fullchain.pem'),
}, app);

app.post('/timeline/submission', (req, res) => {
    console.log(req.body);
    res.send("Timeline submission received!");
})

httpServer.listen(HTTP_PORT, () => {
    console.log('HTTP Server running on port 80');
});

httpsServer.listen(HTTPS_PORT, () => {
    console.log('HTTPS Server running on port 443');
});