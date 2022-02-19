import { Deta } from "deta";
import { round } from "utils";
import User from "./User";

const deta = Deta(process.env.DETA_PROJECT_KEY),
  groups = deta.Base("groups");

export default class Group {
  key: string;
  name: string | null;
  members: { [userKey: string]: number } | null;

  constructor(
    key: string,
    group: {
      name: string | null;
      members: { [userKey: string]: number } | null;
    } | null = null
  ) {
    this.key = key;
    this.name = group?.name || null;
    this.members = group?.members || null;
  }

  async init() {
    const group = (await groups.get(this.key)) as {
      name: string | null;
      members: { [userKey: string]: number } | null;
    };

    if (group !== null) {
      const { name, members } = group;
      if (name) this.name = name;
      if (members) this.members = members;
    } else throw new Error("User not found");
  }

  /**
   *
   * @param {string} groupName
   * @returns {Group}
   */
  static async createNew(groupName: string) {
    const { key, name, members } = (await groups.put({
      name: groupName,
      members: null,
    })) as {
      key: string;
      name: string;
      members: { [userKey: string]: number } | null;
    };

    return new Group(key, { name, members });
  }

  async addMember(userKey: string) {
    const members = { ...(this.members || {}), [userKey]: 0 };
    await groups.update({ members }, this.key);

    this.members = members;
  }

  async addBill(amount: number | string, userKey: string) {
    const members = {
      ...this.members,
      [userKey]: this.members![userKey] + Number(amount),
    };

    await groups.update(
      {
        members,
      },
      this.key
    );

    this.members = members;
  }

  getNetto(_round = false) {
    const money = Object.values(this.members!);
    const med = money.reduce((a, b) => a + b) / money.length;
    let membersNet: typeof this.members = {};
    for (let a of Object.keys(this.members!)) {
      membersNet[a] = _round
        ? round(med - this.members![a])
        : med - this.members![a];
    }
    return membersNet;
  }

  async getStatus() {
    const nettoMembers = this.getNetto(true);

    const status = await Promise.all(
      Object.keys(nettoMembers).map(async (userKey) => {
        const username = await User.getUsername(userKey);
        return `*${username}* is ${nettoMembers[userKey]}`;
      })
    );

    return status;
  }

  async sumUp(): Promise<
    {
      from: string;
      to: string;
      amount: number;
    }[]
  > {
    const membersNet = this.getNetto();

    let creditors: [string, number][] = [],
      debtors: [string, number][] = [],
      transactions: {
        from: string;
        to: string;
        amount: number;
      }[] = [];

    for (const memberNet of Object.keys(membersNet))
      membersNet[memberNet] < 0
        ? creditors.push([memberNet, membersNet[memberNet]])
        : membersNet[memberNet] > 0 &&
          debtors.push([memberNet, membersNet[memberNet]]);

    for (const debtor of debtors)
      while (debtor[1] !== 0) {
        let transaction: {
          from: string;
          to: string;
          amount: number;
        } = {
          from: debtor[0],
          to: creditors[0][0],
          amount: 0,
        };

        if (debtor[1] >= -creditors[0][1]) {
          transaction.amount = round(-creditors[0][1]);
          debtor[1] += creditors[0][1];
          creditors.shift();
        } else {
          transaction.amount = round(debtor[1]);
          creditors[0][1] -= debtor[1];
          debtor[1] = 0;
        }
        transactions.push(transaction);
      }

    await this.clearGroupBalance();

    return transactions;
  }

  async clearGroupBalance() {
    let members: typeof this.members = {};
    for (const userKey of Object.keys(this.members!)) members[userKey] = 0;
    await groups.update({ members }, this.key);
    this.members = members;
  }

  static async getGroupCount() {
    let res = await groups.fetch();
    let allItems = res?.items || [];

    // continue fetching until last is not seen
    while (res.last) {
      res = await groups.fetch({}, { last: res.last });
      allItems = allItems.concat(res.items);
    }

    return allItems.length as number;
  }
}
