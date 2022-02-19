import axios from "axios";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { sOrNoS } from "utils";

export default function Index() {
  const [stats, setStats] = useState({ nbOfUsers: "-", nbOfGroups: "-" }),
    { nbOfUsers, nbOfGroups } = stats;

  useEffect(() => {
    axios.get("/api/stats").then((res) => setStats(res.data));
  }, []);

  return (
    <section>
      <h1>
        This is{" "}
        <Link href="https://www.facebook.com/starling.split/">
          Starling Split
        </Link>
      </h1>
      <p>
        A Facebook Messenger bot that introduces bill splitting within a group
        for Starling Bank users.
      </p>
      <p style={{ fontWeight: "bold" }}>
        To use the bot please go to the{" "}
        <Link href="https://www.facebook.com/starling.split/">
          Facebook Starling Split page
        </Link>
        , message the bot and start splitting!
      </p>
      <p>
        Currently there are {nbOfUsers} user{sOrNoS(nbOfUsers)} ({nbOfGroups}{" "}
        group
        {sOrNoS(nbOfGroups)}) using the bot.
      </p>
    </section>
  );
}
