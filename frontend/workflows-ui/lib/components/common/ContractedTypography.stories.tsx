import ContractedTypography from "./ContractedTypography";
import { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof ContractedTypography> = {
  title: "ContractedTypography",
  component: ContractedTypography,
  tags: ["autodocs"],
  decorators: [(story) => <div style={{ width: "400px" }}>{story()}</div>],
  parameters: {
    docs: {
      description: {
        component: `
            An extension of the MUI typography component that hides overflow after a certain number of lines using elipses
            When elipses are present a tooltip is automatically generated to show all text (including what is hidden)
        `,
      },
    },
  },
};

type Story = StoryObj<typeof ContractedTypography>;

export default meta;

export const Basic: Story = {
  args: {
    children:
      "One line of text that is too long so its contracted using elipses",
  },
};

export const Multiline: Story = {
  args: {
    children: `
        This component also allows you to specify how many lines
        of text are allowed before the elipses is introduced.
        The parameter is called noWrapAfterLines and its default is 1
        (because in most cases users will only want one
        line of text). However, in description components it is common to contract after multiple lines.
    `,
    noWrapAfterLines: 3,
  },
};

export const NoElipses: Story = {
  args: {
    children: "This will not have a tooltip",
  },
};

export const TypogrpahyArguments: Story = {
  args: {
    children: "The component allows feeding props to its typography child",
    variant: "h1",
    sx: { textAlign: "center" },
  },
};

export const TooltipArguments: Story = {
  args: {
    children: "The component allows feeding props to its tooltip child as well",
    tooltipProps: {
      placement: "left",
      enterDelay: 0,
    },
  },
};
