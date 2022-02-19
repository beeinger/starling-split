import Group from "classes/Group";
import User from "classes/User";
import type { NextApiRequest, NextApiResponse } from "next";

const getStats = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    let nbOfUsers = await User.getUserCount(),
      nbOfGroups = await Group.getGroupCount();

    res.json({ nbOfUsers, nbOfGroups });
  } else res.status(404).send("NOT_FOUND");
};

export default getStats;
