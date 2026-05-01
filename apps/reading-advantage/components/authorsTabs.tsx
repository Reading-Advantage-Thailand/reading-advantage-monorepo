"use client";
import React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import authorsFiction from "../data/authors-fiction.js";
import authorsNonFiction from "../data/authors-nonfiction.js";

export default function AuthorsTabs() {
  return (
    <Tabs.Root className="TabsRoot" defaultValue="tab1">
      <Tabs.List className="TabsList" aria-label="Authors">
        <Tabs.Trigger className="TabsTrigger" value="tab1">
          Fiction
        </Tabs.Trigger>
        <Tabs.Trigger className="TabsTrigger" value="tab2">
          Non Fiction
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content className="TabsContent" value="tab1">
        <section>
          <div style={{ margin: "0 auto", maxWidth: "800px", padding: "20px" }}>
            <h1 className="font-bold text-center mb-4">Authors: Fiction</h1>
            {authorsFiction.map((author: any, index: number) => (
              <div key={index} style={{ marginBottom: "40px" }}>
                <h2>
                  <span className="font-bold">{author.genre}:</span>{" "}
                  {author.author} - {author.description}
                </h2>
                <p></p>
              </div>
            ))}
          </div>
        </section>
      </Tabs.Content>
      <Tabs.Content className="TabsContent" value="tab2">
        <section>
          <div style={{ margin: "0 auto", maxWidth: "800px", padding: "20px" }}>
            <h1 className="font-bold text-center mb-4">Authors: Non Fiction</h1>
            {authorsNonFiction.map((author: any, index: number) => (
              <div key={index} style={{ marginBottom: "40px" }}>
                <h2>
                  <span className="font-bold">{author.genre}:</span>{" "}
                  {author.author} - {author.description}
                </h2>
                <p></p>
              </div>
            ))}
          </div>
        </section>
      </Tabs.Content>
    </Tabs.Root>
  );
}
