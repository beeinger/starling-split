import Group from "classes/Group";
import User from "classes/User";
import type { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    let nbOfUsers = await User.getUserCount(),
      nbOfGroups = await Group.getGroupCount();

    res.json({ nbOfUsers, nbOfGroups });
  } else res.status(404).send("NOT_FOUND");
};
