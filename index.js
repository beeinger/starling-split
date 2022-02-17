const User = require("./classes/User");
const app = require("fastify")();
const handleMessage = require("./handlers/message.handler");
const privacyPolicy = require("./utils/privacyPolicy");

require("dotenv").config();

app.get("/privacy-policy", async (req, res) => {
  res.type("text/html");
  res.send(privacyPolicy);
});

app.get("/", async (req, res) => {
  const userCount = await User.getUserCount();

  res.type("text/html");
  res.send(
    "<h2>Hi, the bot is running!\u000ACurrently there are " +
      userCount +
      " users using this bot.</h2><a href='/privacy-policy'>Privacy Policy</a>"
  );
});

app.post("/webhook", async (req, res) => {
  let body = req.body;
  try {
    // Checks this is an event from a page subscription
    if (body.object === "page") {
      // Iterates over each entry - there may be multiple if batched

      await Promise.all(body.entry.map(handleMessage));

      console.log("EVENT_RECEIVED");
      // Returns a '200 OK' response to all requests
      res.status(200).send("EVENT_RECEIVED");
    } else {
      console.log("ERROR_RECEIVING_EVENT");
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }
  } catch (error) {
    console.log("PROBABLY_PAGE_ACCESS_TOKEN_EXPIRED", error);
    res.sendStatus(500);
  }
});

// Adds support for GET requests to our webhook
app.get("/webhook", (req, res) => {
  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  // Parse the query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      console.log("WEBHOOK_NOT_VERIFIED");
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

module.exports = app;
