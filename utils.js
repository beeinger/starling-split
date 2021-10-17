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

function getNetto(members, _round) {
  const money = Object.values(members);
  const med = money.reduce((a, b) => a + b) / money.length;
  let membersNet = {};
  for (let a of Object.keys(members)) {
    membersNet[a] = _round ? round(med - members[a]) : med - members[a];
  }
  return membersNet;
}

function round(num) {
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const rounded = (Math.ceil(abs * 100) / 100).toFixed(2);

  return isNegative ? "-" + rounded : rounded;
}

function sumUp(members) {
  const membersNet = getNetto(members);
  console.log(membersNet);

  let creditors = [],
    debtors = [];

  Object.keys(membersNet).forEach((a) =>
    membersNet[a] < 0
      ? creditors.push([a, membersNet[a]])
      : membersNet[a] > 0 && debtors.push([a, membersNet[a]])
  );
  let transactions = [];

  debtors.forEach((debtor) => {
    while (debtor[1] !== 0) {
      let transaction = null;

      if (debtor[1] >= -creditors[0][1]) {
        transaction = {
          from: debtor[0],
          to: creditors[0][0],
          amount: round(-creditors[0][1]),
        };
        debtor[1] += creditors[0][1];
        creditors.shift();
      } else {
        transaction = {
          from: debtor[0],
          to: creditors[0][0],
          amount: round(debtor[1]),
        };
        creditors[0][1] -= debtor[1];
        debtor[1] = 0;
      }

      transactions.push(transaction);
    }
  });

  return transactions;
}

module.exports = {
  sumUp,
  getNetto,
  sendMessage,
  sendNotification,
};
