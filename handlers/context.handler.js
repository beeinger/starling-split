/**
 *
 * @param {User} user
 * @param {string} message
 */
function getContext(user, message) {
  if (user.username === null) {
    if (!/^\S*$/.test(message)) return "invalid_username";
    else return "set_username";
  } else if (message.toLowerCase() === "change username")
    return "change_username";
  else if (user.join !== null) {
    if (message.toLowerCase() === "yes") return "accept_invite";
    else if (message.toLowerCase() === "no") return "decline_invite";
    else return "inform_about_invite";
  } else if (
    user.group === null &&
    /^Create a group called .*$/im.test(message)
  )
    return "create_group";
  else if (user.group !== null) {
    if (user.group.members === null) return "add_group_members";
    else if (message.toLowerCase() === "status") return "status";
    else if (message.toLowerCase() === "sum up") return "sum_up";
    else if (
      /https:\/\/settleup\.starlingbank\.com\/\S*\?amount=\S*(&message=\S*)?/.test(
        message
      )
    )
      return "add_bill";
  }

  return "unknown_command";
}

module.exports = getContext;
