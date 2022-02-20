import axios from "axios";
import Head from "next/head";
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
      <Head>
        <title>Starling Split Messenger bot</title>
      </Head>
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
      <Link href="/privacy-policy">
        <a style={{ marginTop: "32px", display: "block" }}>Privacy Policy</a>
      </Link>
      <p
        style={{
          position: "fixed",
          bottom: "16px",
          fontSize: "0.9rem",
          fontWeight: "bold",
        }}
      >
        Note: This is an MVP version, styling of this page and more
        functionalities of the bot will come in the future. For the progress go{" "}
        <Link href="https://github.com/beeinger/starling-split/tree/master#readme">
          here
        </Link>
        .
      </p>
    </section>
  );
}
