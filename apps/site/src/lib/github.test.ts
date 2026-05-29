import { afterEach, describe, expect, it, vi } from "vitest";
import { getLatestRelease, getOrgRepos } from "./github";

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

afterEach(() => vi.unstubAllGlobals());

describe("getOrgRepos", () => {
  it("maps the GitHub repo payload by name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          { name: "hummingbot", description: "the bot", stargazers_count: 12, html_url: "https://github.com/hummingbot/hummingbot" },
          { name: "condor", description: null, stargazers_count: 3, html_url: "https://github.com/hummingbot/condor" },
        ]),
      ),
    );
    const map = await getOrgRepos();
    expect(map.size).toBe(2);
    expect(map.get("hummingbot")).toEqual({
      name: "hummingbot",
      description: "the bot",
      stars: 12,
      url: "https://github.com/hummingbot/hummingbot",
    });
    expect(map.get("condor")!.description).toBeNull();
  });

  it("returns an empty map on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([], false, 403)));
    expect((await getOrgRepos()).size).toBe(0);
  });

  it("returns an empty map when fetch throws (offline build)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect((await getOrgRepos()).size).toBe(0);
  });
});

describe("getLatestRelease", () => {
  it("returns the tag name", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ tag_name: "v2.9.0" })));
    expect(await getLatestRelease("hummingbot")).toBe("v2.9.0");
  });

  it("returns null when absent or on error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({})));
    expect(await getLatestRelease("hummingbot")).toBeNull();

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, false, 404)));
    expect(await getLatestRelease("nope")).toBeNull();

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("boom"); }));
    expect(await getLatestRelease("hummingbot")).toBeNull();
  });
});
