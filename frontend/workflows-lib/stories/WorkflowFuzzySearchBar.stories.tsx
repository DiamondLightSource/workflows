import { Meta, StoryObj } from "@storybook/react";
import { FuzzySearchBar } from "../lib/components/workflow/FuzzySearchBar";
import { useState } from "react";
import Fuse from "fuse.js";
import { Table, TableBody, TableRow, TableCell } from "@mui/material";

const meta: Meta<typeof FuzzySearchBar> = {
  title: "Workflow",
  component: FuzzySearchBar,
};

type Story = StoryObj<typeof FuzzySearchBar>;

export default meta;

const Artifacts = [
  { id: 1, name: "Apple", color: "Red" },
  { id: 2, name: "Banana", color: "Yellow" },
  { id: 3, name: "Cherry", color: "Red" },
  { id: 4, name: "Orange", color: "Orange" },
];

export const fuzzySearch: Story = {
  args: {
    searchQuery: "",
    setSearchQuery: () => {},
  },
  render: () => {
    const FuzzyFinder = () => {
      const [searchQuery, setSearchQuery] = useState("");
      const fuse = new Fuse(Artifacts, {
        keys: ["name", "color"],
        threshold: 0.1,
        includeScore: true,
        includeMatches: true,
      });

      const results = searchQuery ? fuse.search(searchQuery) : [];
      const filtered = searchQuery
        ? results.map((result) => result.item)
        : Artifacts;

      return (
        <>
          <FuzzySearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <Table>
            <TableBody>
              {filtered.map(({ id, name, color }) => (
                <TableRow key={id}>
                  <TableCell>{name}</TableCell>
                  <TableCell>{color}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      );
    };

    return <FuzzyFinder />;
  },
};
