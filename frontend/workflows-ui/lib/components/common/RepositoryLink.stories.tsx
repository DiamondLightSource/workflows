import { Meta, StoryObj } from "@storybook/react";
import { RepositoryLink } from "./RepositoryLink";
import { Stack } from "@mui/material";

const meta: Meta<typeof RepositoryLink> = {
  title: "RepositoryLink",
  component: RepositoryLink,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Button linking to a template repository",
      },
    },
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["full", "auto", "icon"] },
    buttonVariant: {
      control: "inline-radio",
      options: ["outlined", "contained", "text"],
    },
    colour: {
      control: "radio",
      options: ["primary", "secondary", "success", "error", "warning", "info"],
    },
  },
};

type Story = StoryObj<typeof RepositoryLink>;

export default meta;

export const Full: Story = {
  args: {
    variant: "full",
    repository:
      "https://github.com/DiamondLightSource/workflows/tree/main/examples/conventional-templates",
  },
};

export const Icon: Story = {
  args: {
    variant: "icon",
    repository:
      "https://github.com/DiamondLightSource/workflows/tree/main/examples/conventional-templates",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    repository: "",
  },
};

export const Colours: Story = {
  render: () => {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <RepositoryLink
          colour="primary"
          buttonVariant="contained"
          repository={
            "https://github.com/DiamondLightSource/workflows/tree/main/examples/conventional-templates"
          }
          label="Primary"
        />
        <RepositoryLink
          colour="secondary"
          buttonVariant="contained"
          repository={{
            targetRevision: "HEAD",
            repositoryUrl: "https://github.com/DiamondLightSource/workflows",
            path: "/examples/conventional-templates",
          }}
          label="Secondary"
        />
        <RepositoryLink
          colour="success"
          buttonVariant="contained"
          repository={
            "https://github.com/DiamondLightSource/workflows/tree/main/examples/conventional-templates"
          }
          label="Success"
        />
        <RepositoryLink
          colour="error"
          buttonVariant="contained"
          repository={
            "https://github.com/DiamondLightSource/workflows/tree/main/examples/conventional-templates"
          }
          label="Error"
        />
        <RepositoryLink
          colour="info"
          buttonVariant="contained"
          repository={
            "https://github.com/DiamondLightSource/workflows/tree/main/examples/conventional-templates"
          }
          label="Info"
        />
        <RepositoryLink
          colour="warning"
          buttonVariant="contained"
          repository={
            "https://github.com/DiamondLightSource/workflows/tree/main/examples/conventional-templates"
          }
          label="Warning"
        />
      </Stack>
    );
  },
};

export const Variants: Story = {
  render: () => {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <RepositoryLink
          buttonVariant="contained"
          repository={
            "https://github.com/DiamondLightSource/workflows/tree/main/examples/conventional-templates"
          }
          label="Contained"
        />
        <RepositoryLink
          buttonVariant="outlined"
          repository={{
            targetRevision: "HEAD",
            repositoryUrl: "https://github.com/DiamondLightSource/workflows",
            path: "/examples/conventional-templates",
          }}
          label="Outlined"
        />
        <RepositoryLink
          buttonVariant="text"
          repository={
            "https://github.com/DiamondLightSource/workflows/tree/main/examples/conventional-templates"
          }
          label="Text"
        />
      </Stack>
    );
  },
};
