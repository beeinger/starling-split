const { round } = require("../utils");

const { Deta } = require("deta"),
  deta = Deta(process.env.DETA_PROJECT_KEY),
  groups = deta.Base("groups");

class Group {
  constructor(key, group = null) {
    this.key = key;

    if (group !== null) {
      this.name = group.name;
      this.members = group.members;
      return this;
    }

    return (async () => {
      const group = await groups.get(key),
        { name, members } = group;
      this.name = name;
      this.members = members;

      return this;
    })();
  }

  /**
   *
   * @param {string} groupName
   * @returns {Group}
   */
  static async createNew(groupName) {
    const { key, name, members } = await groups.put({
      name: groupName,
      members: null,
    });

    return new Group(key, { name, members });
  }

  async addMember(userKey) {
    const members = { ...(this.members || {}), [userKey]: 0 };
    await groups.update({ members }, this.key);

    this.members = members;
  }

  async addBill(amount, userKey) {
    const members = {
      ...this.members,
      [userKey]: this.members[userKey] + Number(amount),
    };

    await groups.update(
      {
        members,
      },
      this.key
    );

    this.members = members;
  }

  /**
   * Calculates the netto balance for each member
   *
   * @param {boolean} _round - if true, round the amount to 2 decimal places
   * @returns {{[key: string]: number}} membersNet - { userKey: netto }
   */
  getNetto(_round = false) {
    const money = Object.values(this.members);
    const med = money.reduce((a, b) => a + b) / money.length;
    let membersNet = {};
    for (let a of Object.keys(this.members)) {
      membersNet[a] = _round
        ? round(med - this.members[a])
        : med - this.members[a];
    }
    return membersNet;
  }

  async getStatus() {
    const nettoMembers = this.getNetto(true);

    const status = await Promise.all(
      Object.keys(nettoMembers).map(async (userKey) => {
        const username = await require("./User").getUsername(userKey);
        return `*${username}* is ${nettoMembers[userKey]}`;
      })
    );

    return status;
  }

  /**
   * Calculates the transactions needed to sum up a group
   *
   * @returns {{
   *    from: any;
   *    to: any;
   *    amount: number;
   * }[]}
   */
  async sumUp() {
    const membersNet = this.getNetto();

    let creditors = [],
      debtors = [],
      transactions = [];

    for (const memberNet of Object.keys(membersNet))
      membersNet[memberNet] < 0
        ? creditors.push([memberNet, membersNet[memberNet]])
        : membersNet[memberNet] > 0 &&
          debtors.push([memberNet, membersNet[memberNet]]);

    for (const debtor of debtors)
      while (debtor[1] !== 0) {
        let transaction = null;

        transaction = {
          from: debtor[0],
          to: creditors[0][0],
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
    let members = {};
    for (const userKey of Object.keys(this.members)) members[userKey] = 0;
    await groups.update({ members }, this.key);
    this.members = members;
  }
}

module.exports = Group;
