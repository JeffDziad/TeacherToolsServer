const express = require('express');
const history = require('connect-history-api-fallback');
const app = express();
const PORT = 3000;

const staticFileMiddleware = express.static(__dirname + '/www/dist/');
app.use(staticFileMiddleware);
app.use(history({
    disableDotRule: true,
    verbose: true
}));
app.use(staticFileMiddleware);

app.listen(PORT, () => console.log("[Server] Listening on Port 3000..."));