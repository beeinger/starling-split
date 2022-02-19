import type { NextApiRequest, NextApiResponse } from "next";

import handleMessage from "handlers/message.handler";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    let body = req.body;
    try {
      // Checks this is an event from a page subscription
      if (body.object === "page") {
        // Iterates over each entry - there may be multiple if batched
        await Promise.all(body.entry.map(handleMessage));
        // Returns a '200 OK' response to all requests
        res.status(200).send("EVENT_RECEIVED");
      } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.status(404).send("ERROR_RECEIVING_EVENT");
      }
    } catch (error) {
      console.log("PROBABLY_PAGE_ACCESS_TOKEN_EXPIRED");
      console.log(error);
      res
        .status(500)
        .json({ message: "PROBABLY_PAGE_ACCESS_TOKEN_EXPIRED", error });
    }
  } else if (req.method === "GET") {
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    // Parse the query params
    let mode = req.query["hub.mode"],
      token = req.query["hub.verify_token"],
      challenge = req.query["hub.challenge"];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
      // Checks the mode and token sent is correct
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        // Responds with the challenge token from the request
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      }
    }

    console.log("WEBHOOK_NOT_VERIFIED");
    // Responds with '403 Forbidden' if verify tokens do not match
    res.status(403).send("WEBHOOK_NOT_VERIFIED");
  } else res.status(404).send("NOT_FOUND");
};
