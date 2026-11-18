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
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Navigation } from "@diamondlightsource/sci-react-ui";
import { Menu } from "lucide-react";
import UserIcon from "./UserIcon";

export default function NavigationOverlay({
  navigation,
}: {
  navigation: Navigation;
}) {
  // Copied from the Sci react UI storybook
  // (https://diamondlightsource.github.io/sci-react-ui/?path=/story/components-navigation-sidebarnav--with-app-bar)
  const [open, setOpen] = useState(true);

  return (
    <Box sx={{ display: "flex", width: "100vw", height: "100vh" }}>
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

          <Divider
            sx={{ borderColor: "inherit" }}
            orientation="vertical"
            variant="middle"
            flexItem
          />

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
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "inherit",
          flexGrow: 1,
        }}
      >
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
