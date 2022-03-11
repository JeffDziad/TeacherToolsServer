// Database
const admin = require('firebase-admin');
const sa = require('./pvt/teacher-tools-82f7b-firebase-adminsdk-3fvsv-220d06ce46.json');
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
    key: fs.readFileSync('./pvt/privkey.pem'),
    cert: fs.readFileSync('./pvt/fullchain.pem'),
}, app);

class TimelineSubmission {
    constructor(username, answers, score) {
        this.sid = uuid.v4();
        this.username = username;
        this.answers = answers;
        this.score = score;
        this.submission_time = Date.now();
    }
}

class Response {
    constructor(successful, msg, dataObj) {
        this.successful = successful;
        this.msg = msg;
        this.dataObj = dataObj;
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
        .then(function (snapshot) {
            snapshot.forEach(function (doc) {
                let d = doc.data();
                if (d.username.toUpperCase() === username.toUpperCase()) match = true;
            });
        })
        .catch(() => {
            res.send('Something went wrong while submitting your attempt! Please try again later.');
        })
    if (!match) {
        // Username is unique.
        let score = await scoreTimeline(uid, tid, answers);
        await db.collection('users').doc(uid)
            .collection('tools').doc(tid)
            .collection('submissions').add(JSON.parse(JSON.stringify(new TimelineSubmission(username, answers, score))))
            .then(() => {
                res.send(new Response(true, 'Successfully submitted your attempt!', { score: score }));
            })
            .catch(() => {
                res.send(new Response(false, 'Something went wrong while submitting your attempt! Please try again later.', null));
            });
    } else {
        // Username is not unique.
        res.send(new Response(false, 'Username already used. Please choose another.', null));
    }
})

httpServer.listen(HTTP_PORT, () => {
    console.log('HTTP Server running on port 80');
});

httpsServer.listen(HTTPS_PORT, () => {
    console.log('HTTPS Server running on port 443');
});

async function scoreTimeline(uid, tid, answers) {
    let scored = [];
    let index = 0;
    let timelineRef = db.collection('users').doc(uid)
        .collection('tools').doc(tid);
    await timelineRef.get().then(async (doc) => {
        let data = doc.data();
        let points = data.points;
        let sortedPoints = await orderPoints(points);
        sortedPoints.forEach((point) => {
            if(point.defaultInPlace) {
                scored.push({ correct: true, id: point.id });
            } else if(point.id === answers[index].id) {
                scored.push({ correct: true, id: point.id });
            } else {
                scored.push({ correct: false, id: point.id });
            }
            index++;
        });
    });
    return scored;
}

function getMonthFromString(mon){
    let d = Date.parse(mon + "1, 2012");
    if(!isNaN(d)){
        return new Date(d).getMonth();
    }
    return -1;
}

async function orderPoints(points) {
    // Sort points array to be displayed. Filter out impostors.
    let bce = [];
    let ce = [];
    for (let i = 0; i < points.length; i++) {
        let p = points[i];
        if(p.isImpostor) continue;

        if(p.calendarEra === 'BCE') {
            bce.push(p);
        } else if(p.calendarEra === 'CE') {
            ce.push(p);
        }
        formatPointDate(p);
    }

    bce.sort(function(a, b) {
        return b.date-a.date;
    });
    ce.sort(function(a, b) {
        return a.date-b.date;
    });
    return bce.concat(ce);
}

function formatPointDate(point) {
    if(point.day !== "None") {
        // month, day, and year are present
        point["date"] = new Date(parseInt(point.year), getMonthFromString(point.month), parseInt(point.day));
        point["date"].setUTCFullYear(parseInt(point.year));
    } else if(point.month !== "None") {
        // month, and year present
        point["date"] = new Date(parseInt(point.year), getMonthFromString(point.month));
        point["date"].setUTCFullYear(parseInt(point.year));
    } else {
        // just year present
        point["date"] = new Date(parseInt(point.year), 1, 1);
        point["date"].setUTCFullYear(parseInt(point.year));
    }
}

