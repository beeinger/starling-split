const { Deta } = require("deta"),
  deta = Deta(process.env.DETA_PROJECT_KEY),
  users = deta.Base("users"),
  usernames = deta.Base("usernames"),
  groups = deta.Base("groups"),
  { sendMessage, sendNotification, getNetto, sumUp } = require("./utils");

async function handleMessage(entry) {
  let webhook_event = entry.messaging[0];
  console.log(webhook_event);

  const userId = webhook_event.sender.id;
  console.log("userId", userId);
  const user = await users.get(userId);
  console.log("user", user);

  if (user === null) {
    await sendMessage(
      "First you need to give me your Starling username,\u000Aplease respond to this message with your Starling username!",
      userId
    );
    try {
      await users.insert({ username: null, group: null, join: null }, userId);
    } catch (err) {
      await sendMessage("Something went wrong :c", userId);
    }
  } else if (user.username === null) {
    if (!/^\S*$/.test(webhook_event.message.text))
      await sendMessage(
        "The username cannot contain spaces!\u000APlease respond with a username of your choosing!",
        userId
      );
    else {
      try {
        const _user = await usernames.insert(
          userId,
          webhook_event.message.text
        );
        if (_user.value === userId) {
          await users.update({ username: webhook_event.message.text }, userId);
          await sendMessage(
            `Great! Your username is ${webhook_event.message.text}!\u000AIf you'd like to change it say "change username"!`,
            userId
          );
          await sendMessage(
            "Ok, let's start with creating a new group!\u000APlease respond to this message with a group name!",
            userId
          );
        }
      } catch (err) {
        console.log(err);
        await sendMessage(
          "User with that username already exists :c,\u000Aplease respond with a different username!",
          userId
        );
      }
    }
  } else if (webhook_event.message.text.toLowerCase() === "change username") {
    await usernames.delete(user.username);
    await users.update({ username: null }, userId);
    await sendMessage("Ok so what username would you like to have?", userId);
  } else if (user.join !== null) {
    const group = await groups.get(user.join);
    if (webhook_event.message.text.toLowerCase() === "yes") {
      await users.update({ group: user.join, join: null }, userId);
      await sendMessage(
        `Accepted the invite to join group ${group.name}!`,
        userId
      );
    } else if (webhook_event.message.text.toLowerCase() === "no") {
      let members = { ...group.members };
      delete members[userId];

      await groups.update({ members }, user.join);
      await users.update({ join: null }, userId);
      await sendMessage(
        `Declined the invite to join group ${group.name}.`,
        userId
      );
    } else {
      await sendMessage(
        `You have an invite to join group ${group.name},\u000Ado you want to join? (Yes/No)`,
        userId
      );
    }
  } else if (user.group === null) {
    const group = await groups.put({
      name: webhook_event.message.text,
      members: null,
    });
    await users.update({ group: group.key }, userId);
    await sendMessage(
      `A group called ${webhook_event.message.text} has been created!\u000ATell me who do you want to invite to your group, I need usernames separated by comas, e.g. beeinger, PROgienek, Alan123`,
      userId
    );
  } else {
    const group = await groups.get(user.group);
    if (group !== null && group.members === null) {
      const _members = webhook_event.message.text.split(", ");
      let members = {};
      let error = false;

      for (const _member of _members) {
        if (!/^\S*$/.test(_member)) {
          await sendMessage(
            "This is not a list of valid usernames!\u000APlease provide me with usernames separated by comas, e.g. beeinger, PROgienek, Alan123",
            userId
          );
          error = true;
          break;
        }
        const member = await usernames.get(_member);
        if (member === null) {
          await sendMessage(
            `User with username ${_member} does not exist!\u000APlease provide me with usernames separated by comas, e.g. beeinger, PROgienek, Alan123`,
            userId
          );
          error = true;
          break;
        }

        members[member.value] = 0;
      }

      // Add also the user who is creating the group
      members[userId] = 0;

      if (!error) {
        await groups.update({ members }, user.group);
        for (const member of Object.keys(members)) {
          if (member !== userId) {
            await users.update({ join: group.key }, member);
            await sendNotification(
              `You have an invite to join group ${group.name},\u000Ado you want to join? (Yes/No)`,
              member
            );
          }
        }
        await sendMessage(
          `Successfully added ${webhook_event.message.text} to the group!`,
          userId
        );
      }
    } else if (
      /https:\/\/settleup\.starlingbank\.com\/\S*\?amount=\S*(&message=\S*)?/.test(
        webhook_event.message.text
      )
    ) {
      const _query = webhook_event.message.text
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

      if (!isNaN(query.amount)) {
        await groups.update(
          {
            members: {
              ...group.members,
              [userId]: group.members[userId] + Number(query.amount),
            },
          },
          user.group
        );
      } else {
        await sendMessage("Invalid starling link!", userId);
      }
    } else if (webhook_event.message.text.toLowerCase() === "status") {
      // const sumUp()
      const group = await groups.get(user.group);
      const nettoMembers = getNetto(group.members, true);

      const status = await Promise.all(
        Object.keys(nettoMembers).map(async (userId) => {
          const user = await users.get(userId);
          return `*${user.username}* is ${nettoMembers[userId]}`;
        })
      );

      await sendMessage(
        "It looks like this:\u000A\u000A" + status.join("\u000A"),
        userId
      );
    } else if (webhook_event.message.text.toLowerCase() === "sum up") {
      // const sumUp()
      const group = await groups.get(user.group);
      const transactions = sumUp(group.members);

      await sendMessage("You have requested a sum up!", userId);

      let notified = [];

      await Promise.all(
        transactions.map(async (transaction) => {
          const to = await users.get(transaction.to);

          const link = `https://settleup.starlingbank.com/${to.username}?amount=${transaction.amount}&message=Starling%20Split%20Bot`;

          if (!notified.includes(transaction.from)) {
            await sendNotification(
              `Hi, *${user.username}* has requested a sum up!`,
              transaction.from
            );
            notified.push(transaction.from);
          }

          await sendNotification(
            `You need to pay\u000A${transaction.amount} to *${to.username}*\u000A${link}`,
            transaction.from
          );
        })
      );

      let _members = group.members;
      for (const key of Object.keys(_members)) {
        _members[key] = 0;
      }

      await groups.update({ members: _members }, user.group);
    } else {
      await sendMessage(
        `Sorry I'm not a well spoken bot :c\u000AEither send me a link with money to calculate, say "Status" or "Sum up"!`,
        userId
      );
    }
  }
}

module.exports = handleMessage;
