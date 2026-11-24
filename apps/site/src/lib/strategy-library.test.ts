import { describe, expect, it } from "vitest";
import { parseLibrary } from "./strategy-library";

describe("parseLibrary", () => {
  it("maps listings to cards with a link to the library page", () => {
    const [s] = parseLibrary({
      listings: [
        {
          slug: "mm-at-the-touch",
          name: "Market Making At-The-Touch",
          description: "Quotes at the best bid and ask.",
          author: { name: "Raj" },
          free: false,
        },
      ],
    });
    expect(s).toEqual({
      slug: "mm-at-the-touch",
      name: "Market Making At-The-Touch",
      description: "Quotes at the best bid and ask.",
      author: "Raj",
      free: false,
      url: "https://www.botcamp.xyz/strategies/mm-at-the-touch",
    });
  });

  it("skips listings without a slug or name, and bad payloads", () => {
    expect(parseLibrary({ listings: [{ name: "No slug" }, { slug: "x" }] })).toEqual([]);
    expect(parseLibrary(null)).toEqual([]);
    expect(parseLibrary({ listings: "nope" })).toEqual([]);
  });
});
