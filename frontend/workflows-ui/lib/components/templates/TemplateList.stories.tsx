import TemplateList from "./TemplateList";
import { Meta, StoryObj } from "@storybook/react";
import { TemplateOverviewCommonProps } from "./TemplateOverviewCommon";

const meta: Meta<typeof TemplateList> = {
  title: "TemplateList",
  component: TemplateList,
  tags: ["autodocs"],
  decorators: [(story) => <div style={{ width: "300px" }}>{story()}</div>],
  parameters: {
    docs: {
      description: {
        component: "Displays multiple workflows template overviews",
      },
    },
  },
};

type Story = StoryObj<typeof TemplateList>;

export default meta;

function generateCards(range: number) {
  const cardList: TemplateOverviewCommonProps[] = [];
  for (let i = 0; i < range; i++) {
    cardList.push({
      title: "Title " + i.toString(),
      name: "name-" + i.toString(),
      maintainer: "maintainer" + i.toString(),
      description: "description" + i.toString(),
    });
  }
  return cardList;
}

export const Basic: Story = {
  args: {
    cardPropsList: generateCards(3),
    selectedName: null,
    setSelectedName: () => {},
  },
};

export const Selected: Story = {
  args: {
    cardPropsList: generateCards(3),
    selectedName: "name-2",
    setSelectedName: () => {},
  },
};

export const NotClickable: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Non clickable lists will not have hover effects or click effects but will look the same otherwise",
      },
    },
  },
  args: {
    cardPropsList: generateCards(3),
    selectedName: null,
    setSelectedName: () => {},
    disableClick: true,
  },
};

export const Scrollable: Story = {
  args: {
    cardPropsList: generateCards(20),
    selectedName: null,
    setSelectedName: () => {},
  },
  render: (args) => {
    return (
      <div style={{ height: "800px", width: "300px", display: "flex" }}>
        <TemplateList {...args} />
      </div>
    );
  },
};

export const Empty: Story = {
  args: {
    cardPropsList: [],
    selectedName: null,
    setSelectedName: () => {},
  },
};
