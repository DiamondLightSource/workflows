import { RouteObject, Navigate, createBrowserRouter } from "react-router-dom";
import ErrorPage from "./ErrorPage";
import NavigationOverlay from "./NavigationOverlay";
import { RouterProvider } from "react-router-dom";
import { NavRouteObject, navRoutesToNavigation } from "./utils";

export default function WorkflowsRouterProvider({
  routeObjects,
}: {
  routeObjects: NavRouteObject[];
}) {
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

  return <RouterProvider router={createBrowserRouter([routeObject])} />;
}
