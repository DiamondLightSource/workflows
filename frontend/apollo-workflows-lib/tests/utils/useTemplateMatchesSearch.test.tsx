import { templateMatchesSearch } from "../../lib/utils/useTemplateMatchesSearch";

describe("templateMatchesSearch returns correct boolean when", () => {
  const name = "name";
  const title = "title";
  const description = "description";

  it("search string is empty", () => {
    expect(templateMatchesSearch("", name, title, description)).toEqual(true);
  });

  it("search matches name", () => {
    expect(templateMatchesSearch("nam", name, title, description)).toEqual(
      true,
    );
  });

  it("search matches title", () => {
    expect(templateMatchesSearch("itl", name, title, description)).toEqual(
      true,
    );
  });

  it("search matches description", () => {
    expect(templateMatchesSearch("script", name, title, description)).toEqual(
      true,
    );
  });

  it("search matches nothing", () => {
    expect(templateMatchesSearch("search", name, title, description)).toEqual(
      false,
    );
  });
});
