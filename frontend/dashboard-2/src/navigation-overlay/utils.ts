import { ReactNode } from "react";
import { IndexRouteObject, NavLink } from "react-router-dom";
import {
  Navigation,
  NavItemDefinition,
} from "@diamondlightsource/sci-react-ui";

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
export function navRoutesToNavigation(
  navRoutesList: NavRouteObject[],
): Navigation {
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
