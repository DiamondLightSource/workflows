import { Box, Typography } from "@mui/material";
import { TemplateList } from "workflows-lib-2";
import { Theme } from "@mui/material/styles";
// Need to have a sci-react-ui import to use their theming
import { Logo } from "@diamondlightsource/sci-react-ui";
import { useState } from "react";

export default function TemplateRoute() {

  const workflowTemplates = [
    {
        name: "normalisation",
        maintainer: "imaging-i14-group",
        title: "Normalisation",
        description: "Normalises data using min-max scaling."
    },
    {
        name: "calibrate",
        maintainer: "imaging-i14-group",
        title: "Calibrate Data",
        description: "Applies calibration to data using provided calirbation coeffiecients."
    },
    {
        name: "align",
        maintainer: "imaging-i14-group",
        title: "Align Data",
        description: `A utility which takes in a file path, a mask, aligns data according to vertical mass or phase 
        correlation between images, and does some more stuff that should overflow the text box and lead to an elipse`
    },
    ]

    const [selectedTemplateName, setSelectedTemplateName] = useState<String | null>(null);
    
    return (
        // Looking for a colour inbetween background and default??
        // Is default fine??
        <Box sx={{display: "flex", backgroundColor: (theme: Theme) => theme.palette.background.default}}>
            <Box sx={{width: "300px"}}>
                <p>Filter placeholder</p>
                <TemplateList 
                templateData={workflowTemplates} 
                selectedTemplateName={selectedTemplateName} 
                setSelectedTemplateName={setSelectedTemplateName}
                />
            </Box>
            <Box>
                <Typography>Data card placeholder</Typography>
                <Typography>{selectedTemplateName} is currently selected</Typography>
            </Box>
        </Box>
    );
}