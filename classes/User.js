const Group = require("./Group");

const { Deta } = require("deta"),
  deta = Deta(process.env.DETA_PROJECT_KEY),
  users = deta.Base("users"),
  usernames = deta.Base("usernames");

class User {
  /**
   *
   * @param {string} key facebookId or userKey
   * @param {{
   *    username: string | null;
   *    group: Group | null,
   *    join: Group | null
   * }} user
   * @returns {User}
   */
  constructor(key, user = null) {
    this.key = key;

    if (user !== null) {
      this.username = user.username;
      this.group = user.group;
      this.join = user.join;
      return this;
    }

    return (async () => {
      const user = await users.get(key);

      if (user === null) return null;

      const { group, username, join } = user;

      if (username) this.username = username;
      else this.username = null;

      if (group) this.group = await new Group(group);
      else this.group = null;

      if (join) this.join = await new Group(join);
      else this.join = null;

      return this;
    })();
  }

  /**
   *
   * @param {string} facebookId
   * @returns {User}
   */
  static async initialize(facebookId) {
    try {
      const { key, username, group, join } = await users.insert(
        {
          username: null,
          group: null,
          join: null,
        },
        facebookId
      );

      return new User(key, { username, group, join });
    } catch (err) {
      return null;
    }
  }

  async createUsername(username) {
    await usernames.insert(this.key, username);
    await users.update({ username }, this.key);

    this.username = username;
  }

  /**
   *
   * @param {string} userKey
   * @returns {Promise<string>} username
   */
  static async getUsername(userKey) {
    const user = await users.get(userKey);
    return user.username;
  }

  static async getKeyByUsername(username) {
    const user = await usernames.get(username);
    return user.value;
  }

  async deleteUsername() {
    await usernames.delete(this.username);
    await users.update({ username: null }, this.key);

    this.username = null;
  }

  static async exists(username) {
    const member = await usernames.get(username);
    return member !== null;
  }

  async createGroup(name) {
    const group = await Group.createNew(name);
    await users.update({ group: group.key }, this.key);

    this.group = group;
  }

  async addBill(amount) {
    await this.group.addBill(amount, this.key);
  }

  /**
   *
   * @param {string[]} members
   */
  async addGroupMembers(members) {
    this.group.addMember(this.key);

    for (const member of members)
      if (member !== this.key) {
        await users.update({ join: this.group.key }, member);
      }
  }

  async acceptJoin() {
    await users.update({ group: this.join.key, join: null }, this.key);
    this.group = this.join;
    this.join = null;
    await this.group.addMember(this.key);
  }

  async declineJoin() {
    await users.update({ join: null }, this.key);

    this.join = null;
  }

  static async getUserCount() {
    let res = await usernames.fetch();
    let allItems = res.items;

    // continue fetching until last is not seen
    while (res.last) {
      res = await usernames.fetch({}, { last: res.last });
      allItems = allItems.concat(res.items);
    }

    return allItems.length;
  }
}

module.exports = User;
