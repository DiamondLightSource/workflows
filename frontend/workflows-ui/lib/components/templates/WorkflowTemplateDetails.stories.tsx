import { Meta, StoryObj } from "@storybook/react";
import { WorkflowTemplateDetails } from "./WorkflowTemplateDetails";

const meta: Meta<typeof WorkflowTemplateDetails> = {
  title: "WorkflowTemplateDetails",
  component: WorkflowTemplateDetails,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A page that displays a single template. Can optionally include a link to the template repository and/or a form to submit a workflow.",
      },
    },
  },
};

type Story = StoryObj<typeof WorkflowTemplateDetails>;

export default meta;

export const DetailsOnly: Story = {
  args: {
    template: {
      title: "MPI Matrix Benchmark",
      name: "mpi-workflow",
      description:
        "Creates an MPIJob and runs a matrix multiplication benchmark across multiple nodes.",
      maintainer: "example-manifests-group",
      uiSchema: null,
      arguments: {},
      templateSource: {
        repositoryUrl: "https://github.com/DiamondLightSource/workflows",
        targetRevision: "HEAD",
        path: "examples/conventional-templates",
      },
    },
  },
};

export const NoRepoLink: Story = {
  args: { ...DetailsOnly.args, showRepoLink: false },
};

export const WithSubmissionForm: Story = {
  args: {
    template: {
      title: "DAWN Powder calibration",
      name: "dawn-powder-calibration",
      description:
        "Runs the DAWN command-line powder calibration tool from a given config JSON file. All file paths used\nin the config must be in the same directory as the config file (or within a sub-directory).\n(https://diamondlightsource.atlassian.net/wiki/spaces/DT/pages/1378465/Command-Line+Powder+Calibration)\n",
      maintainer: "example-manifests-group",
      uiSchema: {
        type: "VerticalLayout",
        elements: [
          {
            type: "Control",
            scope: "#/properties/confpath",
            label: "Path to the config JSON file",
            options: null,
            rule: null,
          },
          {
            type: "Control",
            scope: "#/properties/fixparam",
            label: "Fix wavelength or distance?",
            options: null,
            rule: null,
          },
          {
            type: "Control",
            scope: "#/properties/fixvalue",
            label: "Wavelength (Angstrom)",
            options: null,
            rule: {
              condition: {
                schema: {
                  const: "-fixedWavelength",
                },
                scope: "#/properties/fixparam",
              },
              effect: "SHOW",
            },
          },
          {
            type: "Control",
            scope: "#/properties/fixvalue",
            label: "Distance (mm)",
            options: null,
            rule: {
              condition: {
                schema: {
                  const: "-fixedDistance",
                },
                scope: "#/properties/fixparam",
              },
              effect: "SHOW",
            },
          },
        ],
        options: null,
        rule: null,
      },
      arguments: {
        properties: {
          confpath: {
            default: "/path/to/config.json",
            minLength: 1,
            type: "string",
          },
          fixparam: {
            default: "",
            oneOf: [
              {
                const: "",
                title: "Nothing fixed",
              },
              {
                const: "-fixedWavelength",
                title: "Fixed wavelength",
              },
              {
                const: "-fixedDistance",
                title: "Fixed distance",
              },
            ],
            type: "string",
          },
          fixvalue: {
            minimum: 0,
            type: "number",
          },
        },
        required: ["confpath", "fixparam", "fixvalue"],
        type: "object",
      },
      templateSource: {
        repositoryUrl: "https://github.com/DiamondLightSource/workflows",
        targetRevision: "HEAD",
        path: "examples/conventional-templates",
      },
    },
    onSubmit: async () => {},
  },
};
