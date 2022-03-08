// Database
const admin = require('firebase-admin');
const sa = require('PATH/TO/.JSON');
admin.initializeApp({
    credential: admin.credential.cert(sa)
});
const db = admin.firestore();

const express = require('express');
const history = require('connect-history-api-fallback');
const https = require('https');
const http = require('http');
const fs = require('fs');
const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const uuid = require('uuid');

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

class TimelineSubmission {
    constructor(username, answers) {
        this.sid = uuid.v4();
        this.username = username;
        this.answers = answers;
    }
}

app.post('/timeline/submission', async (req, res) => {
    let uid = req.body.uid;
    let tid = req.body.tid;
    let answers = req.body.answers;
    let username = req.body.username;
    let match = false;
    await db.collection('users').doc(uid)
        .collection('tools').doc(tid)
        .collection('submissions').get()
        .then(function(snapshot) {
            snapshot.forEach(function(doc) {
                let d = doc.data();
                if(d.username.toUpperCase() === username.toUpperCase()) match = true;
            });
        })
        .catch(() => {
            res.send('Something went wrong while submitting your attempt! Please try again later.');
        })
    if(!match) {
        // Username is unique.
        await db.collection('users').doc(uid)
            .collection('tools').doc(tid)
            .collection('submissions').add(JSON.parse(JSON.stringify(new TimelineSubmission(username, answers))))
            .then(() => {
                res.send('Successfully submitted your attempt!');
            })
            .catch(() => {
                res.send('Something went wrong while submitting your attempt! Please try again later.');
            });
    } else {
        // Username is not unique.
        res.send('Username already used. Please choose another.');
    }
})

httpServer.listen(HTTP_PORT, () => {
    console.log('HTTP Server running on port 80');
});

httpsServer.listen(HTTPS_PORT, () => {
    console.log('HTTPS Server running on port 443');
});