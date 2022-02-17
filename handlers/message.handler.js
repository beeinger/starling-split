const User = require("../classes/User");
const { sendMessage, sendNotification } = require("../utils");
const getContext = require("./context.handler");

async function handleMessage(entry) {
  const webhook_event = entry.messaging[0],
    facebookId = webhook_event.sender.id,
    message = webhook_event.message.text;

  let user = await new User(facebookId);
  if (user === null) {
    user = await User.initialize(facebookId);
    if (user === null)
      return await sendMessage("Something went wrong :c", facebookId);
    else {
      await sendMessage(
        "Welcome!\u000A\u000AFirst you need to give me your Starling username,\u000Aplease respond to this message with your Starling username!",
        facebookId
      );
    }
    return;
  }

  const action = getContext(user, message);
  switch (action) {
    case "invalid_username":
      await sendMessage(
        "The username cannot contain spaces!\u000APlease respond with a username of your choosing!",
        user.key
      );
      break;
    case "set_username":
      try {
        await user.createUsername(message);
        await sendMessage(
          `Great! Your username is ${message}!\u000AIf you'd like to change it say "change username"!\u000A\u000AOtherwise you can either say:\u000A"Create a group called groupName"\u000Aor wait for an invitation!`,
          user.key
        );
      } catch (err) {
        await sendMessage(
          "User with that username already exists :c,\u000Aplease respond with a different Starling username!",
          user.key
        );
      }
      break;
    case "change_username":
      await user.deleteUsername();
      await sendMessage(
        "Ok, please respond with your Starling username!",
        user.key
      );
      break;
    case "accept_invite":
      await user.acceptJoin();
      await sendMessage(
        `Accepted the invite to join group ${user.group.name}!`,
        user.key
      );
      break;
    case "decline_invite":
      await user.declineJoin();
      await sendMessage(
        `Declined the invite to join group ${user.group.name}.`,
        user.key
      );
      break;
    case "inform_about_invite":
      await sendMessage(
        `You have an invite to join group ${user.join.name},\u000Ado you want to join? (Yes/No)`,
        user.key
      );
      break;
    case "create_group": {
      const groupName = message.replace(/^Create a group called /im, "");
      await user.createGroup(groupName);

      await sendMessage(
        `A group called ${groupName} has been created!\u000ATell me who do you want to invite to your group, I need Starling usernames separated by comas: e.g. user1, user2, user3`,
        user.key
      );
      break;
    }
    case "add_group_members": {
      const memberUsernames = message.split(", ");

      let error = false,
        memberKeys = [];
      for (const memberUsername of memberUsernames) {
        if (!/^\S*$/.test(memberUsername)) {
          await sendMessage(
            "This is not a list of valid usernames!\u000APlease provide me with Starling usernames separated by comas: e.g. user1, user2, user3",
            user.key
          );
          error = true;
          break;
        }
        const memberKey = await User.getKeyByUsername(memberUsername);
        if (!memberKey) {
          await sendMessage(
            `User with username ${memberUsername} does not exist!\u000APlease provide me with Starling usernames separated by comas: e.g. user1, user2, user3`,
            user.key
          );
          error = true;
          break;
        }
        memberKeys.push(memberKey);
      }
      if (!error) {
        await user.addGroupMembers(memberKeys);

        for (const memberKey of memberKeys) {
          if (memberKey !== user.key) {
            await sendNotification(
              `You have an invite to join group ${user.group.name},\u000Ado you want to join? (Yes/No)`,
              memberKey
            );
          }
        }

        await sendMessage(
          `Successfully added ${message} to the group!`,
          user.key
        );
      }
      break;
    }
    case "status": {
      const status = await user.group.getStatus();

      await sendMessage(
        "It looks like this:\u000A\u000A" + status.join("\u000A"),
        user.key
      );
      break;
    }
    case "sum_up": {
      const transactions = await user.group.sumUp();

      await sendMessage("You have requested a sum up!", user.key);

      let notified = [];

      await Promise.all(
        transactions.map(async (transaction) => {
          if (!notified.includes(transaction.from)) {
            await sendNotification(
              `Hi, *${user.username}* has requested a sum up!`,
              transaction.from
            );
            notified.push(transaction.from);
          }

          const to = await User.getUsername(transaction.to),
            link = `https://settleup.starlingbank.com/${to}?amount=${transaction.amount}&message=Starling%20Split%20Bot`;
          await sendNotification(
            `You need to pay\u000A${transaction.amount} to *${to}*\u000A${link}`,
            transaction.from
          );
        })
      );

      break;
    }
    case "add_bill": {
      const _query = message
        .match(
          /https:\/\/settleup\.starlingbank\.com\/\S*\?amount=\S*(&message=\S*)?/
        )[0]
        .split("?")[1]
        .split("&");

      let query = {};

      for (const string of _query) {
        const parts = string.split("=");
        query[parts[0]] = parts[1];
      }

      if (!isNaN(query.amount)) await user.addBill(query.amount);
      else await sendMessage("Invalid starling link!", user.key);

      break;
    }
    case "unknown_command":
    default:
      await sendMessage(
        `Sorry I'm not a well spoken bot :c\u000A` +
          (user.group
            ? `Either send me a link with a bill to split, say "Status" or "Sum up"!`
            : `Either say "Create a group called groupName" or wait for an invitation!`),
        user.key
      );
  }
}

module.exports = handleMessage;
