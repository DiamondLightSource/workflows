import { SidebarNav } from "@diamondlightsource/sci-react-ui";
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Divider,
} from "@mui/material";
import { Logo } from "@diamondlightsource/sci-react-ui";
import { Theme } from "@mui/material/styles";
import { ColourSchemeButton } from "@diamondlightsource/sci-react-ui";
import { ReactNode, useState } from "react";
import {
  createBrowserRouter,
  RouteObject,
  IndexRouteObject,
  NavLink,
  Outlet,
  Navigate,
} from "react-router-dom";
import {
  Navigation,
  NavItemDefinition,
} from "@diamondlightsource/sci-react-ui";
import { Menu } from "lucide-react";
import ErrorPage from "./ErrorPage";
import UserIcon from "./UserIcon";

// A type to represent both NavItemDefinitions (from Sci React UI) and RouteObjects
// Cant extend RouteObject because its a union of types
// Could extend both and union them??
// Shouldnt need non-index route objects anyway (for now)
export interface NavRouteObject extends IndexRouteObject {
  icon: ReactNode;
  // If left undefined the path is used (capitalised and spaced)
  label?: string;
}

// Coverts kebab case to title case
// https://stackoverflow.com/questions/32589197/how-can-i-capitalize-the-first-letter-of-each-word-in-a-string-using-javascript
export function kebabToTitle(str: string): string {
  const splitStr = str.toLowerCase().split("-");
  for (let i = 0; i < splitStr.length; i++) {
    splitStr[i] =
      splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }
  return splitStr.join(" ");
}

// Converts a list of NavRouteObjects into a Navigation
// Creates a NavItemDefinition from each NavRouteObject
// and stores them all in a single NavItemGroup
function navRoutesToNavigation(navRoutesList: NavRouteObject[]): Navigation {
  const navItems: NavItemDefinition[] = [];

  for (const navRouteObject of navRoutesList) {
    // If NavRouteObject has a label use that
    // If NavRouteObject has a path use it in title case
    // Otherwise default to empty string
    let label = "";
    if (navRouteObject.label !== undefined) {
      label = navRouteObject.label;
    } else if (navRouteObject.path !== undefined) {
      label = kebabToTitle(navRouteObject.path);
    }

    let path = "/";
    if (navRouteObject.path !== undefined) {
      path += navRouteObject.path;
    }

    navItems.push({
      label: label,
      icon: navRouteObject.icon,
      linkProps: { to: path, component: NavLink },
    });
  }

  const navigation: Navigation = [
    {
      navItems: navItems,
    },
  ];

  return navigation;
}

function NavigationOverlay({ navigation }: { navigation: Navigation }) {
  // Copied from the Sci react UI storybook
  // (https://diamondlightsource.github.io/sci-react-ui/?path=/story/components-navigation-sidebarnav--with-app-bar)
  const [open, setOpen] = useState(true);

  return (
    <Box sx={{ display: "flex" 
     , maxWidth: "100vw", maxHeight: "100vh"
    }}>
      {/* Are  there not AppBar components already made?? 
                TODO: Switch this out for a premade Sci react UI appbar component*/}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme: Theme) => theme.zIndex.drawer + 1,
          borderColor: "divider",
          bgcolor: (theme: Theme) => theme.palette.brand?.main,
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={() => {
              setOpen(!open);
            }}
          >
            <Menu />
          </IconButton>

          <Box sx={{ mr: 2, mt: 1.5 }}>
            <Logo sx={{ display: "block" }} fixedTone="dark" />
          </Box>

          <Divider sx={{ borderColor: "inherit"}} orientation="vertical" variant="middle" flexItem/>

          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              ml: 1.5,
              mt: 1.25,
              mr: 1.25,
            }}
          >
            Analysis Platform
          </Typography>

          <Box
            sx={{
              ml: "auto",
              display: "flex",
              flexDirection: "horizontal",
              alignItems: "center",
            }}
          >
            <ColourSchemeButton />
            <UserIcon />
          </Box>
        </Toolbar>
      </AppBar>

      <SidebarNav navigation={navigation} open={open} setOpen={setOpen} />
      <Box sx={{display: "flex", flexDirection: "column", height: "inherit"}}>
        {/* Toolbar call here is to align main content vertically below the AppBar
            This is in the official MUI example: 
            https://mui.com/material-ui/react-drawer/#clipped-under-the-app-bar
            Without this, content in this box starts behind AppBar at the top of screen
            This is because AppBar's zIndex has been changed to put it on top of the drawer
          */}
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

export function createRouterWithOverlay(routeObjects: NavRouteObject[]) {
  const navigation = navRoutesToNavigation(routeObjects);
  const firstRoutePath =
    routeObjects[0].path === undefined ? "" : routeObjects[0].path;

  const routeObject: RouteObject = {
    path: "/",
    element: <NavigationOverlay navigation={navigation} />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to={"/" + firstRoutePath} replace />,
      },
      ...routeObjects,
    ],
  };

  return createBrowserRouter([routeObject]);
}
