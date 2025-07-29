import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { ArtifactFilteredList } from "./ArtifactFilteredList";
import type { Artifact } from "workflows-lib";
import { ImageInfo, ScrollableImages } from "./ScrollableImages";
import { useState, useEffect, useMemo } from "react";
import { FuzzySearchBar } from "./FuzzySearchBar";
import Fuse from "fuse.js";

interface TaskInfoProps {
  artifactList: Artifact[];
  onArtifactHover?: (artifactName: Artifact | null) => void;
}

export const TaskInfo: React.FC<TaskInfoProps> = ({
  artifactList,
  onArtifactHover,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredArtifactList, setFilteredArtifactList] = useState<Artifact[]>(
    [],
  );

  useEffect(() => {
    let filtered = artifactList;

    if (searchQuery.trim()) {
      const fuse = new Fuse(filtered, {
        keys: ["name", "parentTask"],
        threshold: 0.1,
        includeScore: true,
        includeMatches: true,
      });
      const results = fuse.search(searchQuery);
      filtered = results.map((result) => result.item);
    }

    setFilteredArtifactList(filtered);
  }, [searchQuery, artifactList]);

  const imageArtifactsInfos: ImageInfo[] = useMemo(() => {
    return artifactList
      .filter((artifact) => artifact.mimeType.startsWith("image"))
      .map((artifact, index) => ({
        src: artifact.url,
        alt: `Gallery Image ${String(index + 1)}`,
      }));
  }, [artifactList]);

  return (
    <Accordion sx={{ width: "100%", my: 0 }} defaultExpanded>
      <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
        <Typography variant="h6">Output Information</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          sx={{
            display: "flex",
            flexDirection: {
              xs: "column",
              sm: "row",
            },
            flexWrap: "wrap",
            gap: 2,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <Box sx={{ flex: 1, minWidth: "300px" }}>
            <FuzzySearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
            <ArtifactFilteredList
              artifactList={filteredArtifactList}
              onArtifactHover={onArtifactHover}
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: "300px",
              visibility: imageArtifactsInfos.length > 0 ? "visible" : "hidden",
              mt: 8,
              paddingLeft: 7,
            }}
          >
            {imageArtifactsInfos.length > 0 && (
              <ScrollableImages
                images={imageArtifactsInfos}
                backgroundColor="#FFF"
              />
            )}
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
