import { Deta } from "deta";
import Group from "classes/Group";

const deta = Deta(process.env.DETA_PROJECT_KEY),
  users = deta.Base("users"),
  usernames = deta.Base("usernames");

export default class User {
  key: string;
  username: string | null;
  group: Group | null;
  join: Group | null;

  constructor(
    key: string,
    user: {
      username: string | null;
      group: Group | null;
      join: Group | null;
    } | null = null
  ) {
    this.key = key;
    this.username = user?.username || null;
    this.group = user?.group || null;
    this.join = user?.join || null;

    return this;
  }

  async login() {
    const user = (await users.get(this.key)) as {
      username: string | null;
      group: string | null;
      join: string | null;
    };

    if (user !== null) {
      const { group, username, join } = user;
      if (username) this.username = username;
      if (group) {
        this.group = await new Group(group);
        await this.group.init();
      }
      if (join) {
        this.join = await new Group(join);
        await this.join.init();
      }
    } else throw new Error("User not found");
  }

  static async createUser(facebookId: string): Promise<User> {
    const { key, username, group, join } = (await users.insert(
      {
        username: null,
        group: null,
        join: null,
      },
      facebookId
    )) as {
      key: string;
      username: null;
      group: null;
      join: null;
    };

    return new User(key, { username, group, join });
  }

  async createUsername(username: string) {
    await usernames.insert(this.key, username);
    await users.update({ username }, this.key);

    this.username = username;
  }

  /**
   *
   * @param {string} userKey
   * @returns {Promise<string>} username
   */
  static async getUsername(userKey: string) {
    const user = await users.get(userKey);
    return (user?.username as string) || null;
  }

  static async getKeyByUsername(username: string) {
    const user = await usernames.get(username);
    return (user?.value as string) || null;
  }

  async deleteUsername() {
    if (this.username === null) return;

    await usernames.delete(this.username);
    await users.update({ username: null }, this.key);

    this.username = null;
  }

  static async exists(username: string) {
    const member = await User.getKeyByUsername(username);
    return member !== null;
  }

  async createGroup(name: string) {
    const group = await Group.createNew(name);
    await users.update({ group: group.key }, this.key);

    this.group = group;
  }

  async addBill(amount: number | string) {
    await this.group?.addBill(amount, this.key);
  }

  async addGroupMembers(members: string[]) {
    this.group?.addMember(this.key);

    for (const member of members)
      if (member !== this.key) {
        await users.update({ join: this.group!.key }, member);
      }
  }

  async acceptJoin() {
    await users.update({ group: this.join!.key, join: null }, this.key);
    this.group = this.join;
    this.join = null;
    await this.group!.addMember(this.key);
  }

  async declineJoin() {
    await users.update({ join: null }, this.key);

    this.join = null;
  }

  static async getUserCount() {
    let res = await usernames.fetch();
    let allItems = res?.items || [];

    // continue fetching until last is not seen
    while (res.last) {
      res = await usernames.fetch({}, { last: res.last });
      allItems = allItems.concat(res.items);
    }

    return allItems.length as number;
  }
}
