import { Box, Typography } from "@mui/material";
import { useState } from "react";
import { TemplateList } from "apollo-workflows-lib";

export default function TemplateRoute() {

    const [selectedTemplateName, setSelectedTemplateName] = useState<String | null>(null);

    return (
        // Looking for a colour inbetween background and default??
        // Is default fine??
        <Box sx={{display: "flex", minHeight: 0}}>
            <Box sx={{display: "flex", flexDirection: "column", width: "300px", minHeight: 0}}>
                <p>Filter placeholder</p>
                <TemplateList
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