import { Visit } from "@diamondlightsource/sci-react-ui";
import {
  visitTextToVisit,
  parseVisitAndTemplate,
  formatErrorMessage,
} from "../../lib/utils/commonUtils";

describe("visitTextToVisit", () => {
  test.each([
    ["ab", 12345, 6],
    ["xx", 1, 10],
    ["bb", 99, 600],
  ])(
    '"%s%i-%i" should be parsed as a visit',
    (proposalCode, proposalNumber, number) => {
      const input = `${proposalCode}${proposalNumber.toString()}-${number.toString()}`;
      const resultVisit: Visit = {
        proposalCode: proposalCode,
        proposalNumber: proposalNumber,
        number: number,
      };
      expect(visitTextToVisit(input)).toStrictEqual(resultVisit);
    },
  );

  test.each([
    "NOT_A_VISIT",
    "xx99999",
    "00000ab",
    "ab-12345-1",
    "xx11111-01",
    "a45-1",
    "cm20164-.1",
    "",
  ])('"%s" should not be a valid visit', (input) => {
    expect(visitTextToVisit(input)).toBeNull();
  });
});

describe("parseVisitAndTemplate", () => {
  test.each([
    ["md", 73575, 22, "conditional-steps-gkwnc"],
    ["xx", 99, 9, "template2"],
  ])(
    '"%s%i-%i-%s" should be parsed as a visit and a template',
    (proposalCode, proposalNumber, number, templateName) => {
      const input = `${proposalCode}${proposalNumber.toString()}-${number.toString()}-${templateName}`;
      const resultVisit: Visit = {
        proposalCode: proposalCode,
        proposalNumber: proposalNumber,
        number: number,
      };
      expect(parseVisitAndTemplate(input)).toStrictEqual([
        resultVisit,
        templateName,
      ]);
    },
  );

  test.each([
    ["dm", 57537, 22],
    ["qi", 707, 111],
  ])(
    '"%s%i-%i" should be parsed as a visit only',
    (proposalCode, proposalNumber, number) => {
      const input = `${proposalCode}${proposalNumber.toString()}-${number.toString()}`;
      const resultVisit: Visit = {
        proposalCode: proposalCode,
        proposalNumber: proposalNumber,
        number: number,
      };
      expect(parseVisitAndTemplate(input)).toStrictEqual([
        resultVisit,
        undefined,
      ]);
    },
  );

  test.each([
    ["1a", 735, 12, "conditional-steps-gkwnc"],
    ["", 0, 0, "template_null"],
  ])(
    '"%s%i-%i-%s" should return null',
    (proposalCode, proposalNumber, number, templateName) => {
      const input = `${proposalCode}${proposalNumber.toString()}-${number.toString()}-${templateName}`;
      expect(parseVisitAndTemplate(input)).toBeNull();
    },
  );
});

describe("formatErrorMessage", () => {
  it("should return an auth error for templates", () => {
    const input =
      "No data returned for operation `TemplatesListViewQuery`, got error(s): Unauthorized";
    expect(formatErrorMessage(input)).toBe(
      "You are not authorised to access the templates.",
    );
  });

  it("should return a template auth error for WorkflowsListViewTemplatesQuery", () => {
    const input =
      "No data returned for operation `WorkflowsListViewTemplatesQuery`, got error(s): Unauthorized";
    expect(formatErrorMessage(input)).toBe(
      "You are not authorised to access the templates.",
    );
  });

  it("should return an auth error for workflows", () => {
    const input =
      "No data returned for operation `WorkflowsListViewQuery`, got error(s): Unauthorized";
    expect(formatErrorMessage(input)).toBe(
      "You are not authorised to access this visit.",
    );
  });

  test.each(["Unknown error", "", undefined])(
    "%s should return a default message",
    (input) => {
      expect(formatErrorMessage(input)).toBe(
        "Something went wrong with the GraphQL query.",
      );
    },
  );
});
