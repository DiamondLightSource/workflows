import {
  createRouterWithOverlay,
  NavRouteObject,
  kebabToTitle,
} from "../src/NavigationOverlay";
import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { Typography } from "@mui/material";
import { NotepadText, Workflow } from "lucide-react";
import userEvent from "@testing-library/user-event";
import { act } from "react";

const firstRouteName = "first-route";
const firstRouteTextContent = "First route root";
const secondRouteName = "second-route";
const secondRouteTextContent = "Second route root";

const basicTestRoutes: NavRouteObject[] = [
  {
    path: firstRouteName,
    element: <Typography>{firstRouteTextContent}</Typography>,
    index: true,
    icon: <NotepadText />,
  },
  {
    path: secondRouteName,
    element: <Typography>{secondRouteTextContent}</Typography>,
    index: true,
    icon: <Workflow />,
  },
];

const user = userEvent.setup();

it("displays all information", async () => {
  // This is how the docs describe to wait for a redner
  // https://react.dev/reference/react/act#rendering-components-in-tests
  // eslint-disable-next-line @typescript-eslint/require-await
  await act(async () => {
    render(
      <RouterProvider router={createRouterWithOverlay(basicTestRoutes)} />,
    );
  });

  expect(screen.getByText("Analysis Platform")).toBeDefined();
  expect(screen.getByText(kebabToTitle(firstRouteName))).toBeDefined();
  expect(screen.getByText(kebabToTitle(secondRouteName))).toBeDefined();
  // ONLY First route text content should be shown
  expect(screen.getByText(firstRouteTextContent)).toBeDefined();
  expect(screen.queryByText(secondRouteTextContent)).toBeNull();
  expect(screen.getByText("Mo C. Kuser")).toBeDefined();

  expect(document.querySelector(".lucide-notepad-text")).not.toBeNull();
  expect(document.querySelector(".lucide-workflow")).not.toBeNull();
});

it("uses navigation routes", async () => {
  render(<RouterProvider router={createRouterWithOverlay(basicTestRoutes)} />);

  const secondNavigationButton = screen.getByText(
    kebabToTitle(secondRouteName),
  );
  await act(async () => {
    await user.click(secondNavigationButton);
  });

  expect(await screen.findByText(secondRouteTextContent)).toBeDefined();

  await expect(screen.findByText(firstRouteTextContent)).rejects.toThrow(
    "Unable to find an element",
  );
});
