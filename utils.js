const { default: axios } = require("axios");
require("dotenv").config();

const token = process.env.FACEBOOK_PAGE_TOKEN;

async function sendMessage(message, userId) {
  return await axios.post(
    "https://graph.facebook.com/v12.0/me/messages?access_token=" + token,
    {
      messaging_type: "UPDATE",
      recipient: {
        id: userId,
      },
      message: {
        text: message,
      },
    }
  );
}

async function sendNotification(message, userId) {
  return await axios.post(
    "https://graph.facebook.com/v12.0/me/messages?access_token=" + token,
    {
      messaging_type: "MESSAGE_TAG",
      tag: "ACCOUNT_UPDATE",
      recipient: {
        id: userId,
      },
      message: {
        text: message,
      },
    }
  );
}

/**
 * Rounds a number to 2 decimal places
 *
 * @param {number} num
 * @returns {number}
 */
function round(num) {
  const isNegative = num < 0,
    abs = Math.abs(num),
    rounded = (Math.ceil(abs * 100) / 100).toFixed(2),
    result = Number(isNegative ? "-" + rounded : rounded);

  return result;
}

module.exports = {
  round,
  sendMessage,
  sendNotification,
};
