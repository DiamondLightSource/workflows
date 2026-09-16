import React from "react";
import { Link } from "react-router-dom";

import {
  Accordion,
  AccordionSummary,
  Box,
  IconButton,
  styled,
  Tooltip,
  Typography,
} from "@mui/material";

import MuiAccordionDetails from "@mui/material/AccordionDetails";

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";

import { Visit, visitToText } from "@diamondlightsource/sci-react-ui";

import { getWorkflowStatusIcon } from "../common/StatusIcons";
import { Workflow } from "../../types";

interface WorkflowProps {
  workflow: Workflow;
  children: React.ReactNode;
  workflowLink?: boolean;
  expanded?: boolean;
  onChange?: () => void;
  retriggerComponent?: React.ComponentType<{
    instrumentSession: Visit;
    workflowId: string;
  }>;
  githubComponent?: React.ComponentType<{
    variant?: "Icon" | "TextIcon";
    instrumentSession: Visit;
    workflowId: string;
  }>;
}

/**
 * Format the submission date.
 *
 * Example:
 * 29 Apr 2026
 */
const formatSubmittedDate = (
  submittedTime?: Workflow["submittedTime"],
): string | null => {
  if (!submittedTime) {
    return null;
  }

  const date = new Date(submittedTime);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

/**
 * Format the submission time.
 *
 * Example:
 * 17:16
 */
const formatSubmittedTime = (
  submittedTime?: Workflow["submittedTime"],
): string | null => {
  if (!submittedTime) {
    return null;
  }

  const date = new Date(submittedTime);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Full date/time used in the tooltip.
 *
 * Example:
 * 29 April 2026, 17:16
 */
const formatFullDateTime = (
  submittedTime?: Workflow["submittedTime"],
): string | null => {
  if (!submittedTime) {
    return null;
  }

  const date = new Date(submittedTime);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Main workflow card.
 */
const WorkflowCard = styled(Accordion)(({ theme }) => ({
  width: "100%",
  minWidth: 0,
  margin: 0,

  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "8px !important",

  boxShadow: "none",
  backgroundColor: theme.palette.background.paper,

  overflow: "hidden",

  "&::before": {
    display: "none",
  },

  "&.Mui-expanded": {
    margin: 0,
  },

  "&:hover": {
    borderColor: theme.palette.action.disabled,
  },
}));

/**
 * Workflow header.
 */
const WorkflowHeader = styled(AccordionSummary)(({ theme }) => ({
  minHeight: 76,

  padding: theme.spacing(1, 1.5),

  "&.Mui-expanded": {
    minHeight: 76,
  },

  "& .MuiAccordionSummary-content": {
    minWidth: 0,
    margin: theme.spacing(0.5, 0),
    alignItems: "center",
  },

  "& .MuiAccordionSummary-content.Mui-expanded": {
    margin: theme.spacing(0.5, 0),
  },

  "& .MuiAccordionSummary-expandIconWrapper": {
    color: theme.palette.text.secondary,
  },
}));

/**
 * Status icon container.
 */
const WorkflowIconContainer = styled(Box)(({ theme }) => ({
  width: 36,
  height: 36,

  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: theme.shape.borderRadius,

  backgroundColor: theme.palette.action.hover,

  color: theme.palette.text.secondary,
}));

/**
 * Creator/date/time metadata row.
 */
const MetadataRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",

  flexWrap: "wrap",

  gap: theme.spacing(0.5, 1.5),

  minWidth: 0,

  marginTop: theme.spacing(0.5),
}));

/**
 * Individual metadata item.
 */
const MetadataItem = styled(Box)(({ theme }) => ({
  display: "inline-flex",

  alignItems: "center",

  gap: theme.spacing(0.5),

  minWidth: 0,

  color: theme.palette.text.secondary,

  "& .MuiSvgIcon-root": {
    fontSize: 15,
    flexShrink: 0,
  },
}));

/**
 * Separator between metadata items only.
 */
const MetadataSeparator = styled(Typography)(({ theme }) => ({
  color: theme.palette.divider,

  fontSize: "12px",

  userSelect: "none",
}));

/**
 * Workflow action buttons.
 */
const WorkflowActions = styled(Box)(({ theme }) => ({
  display: "flex",

  alignItems: "center",

  gap: theme.spacing(0.5),

  flexShrink: 0,
}));

/**
 * Expanded workflow details.
 */
const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(1.5),

  borderTop: `1px solid ${theme.palette.divider}`,

  minHeight: 250,

  boxSizing: "border-box",
}));

const WorkflowAccordion: React.FC<WorkflowProps> = ({
  workflow,
  children,
  workflowLink = false,
  expanded,
  onChange,
  retriggerComponent,
  githubComponent,
}) => {
  const creator = workflow.creator.trim() || "Unknown";

  const submittedDate = formatSubmittedDate(workflow.submittedTime);

  const submittedTime = formatSubmittedTime(workflow.submittedTime);

  const fullSubmittedDateTime = formatFullDateTime(workflow.submittedTime);

  const workflowUrl = `/workflows/${visitToText(
    workflow.instrumentSession,
  )}/${workflow.id}`;

  const RetriggerComponent = retriggerComponent;
  const GithubComponent = githubComponent;

  return (
    <WorkflowCard expanded={expanded} onChange={onChange} disableGutters>
      <WorkflowHeader
        expandIcon={<ArrowDropDownIcon />}
        aria-controls={`workflow-${workflow.id}-content`}
        id={`workflow-${workflow.id}-header`}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            width: "100%",
            minWidth: 0,
          }}
        >
          {/* Workflow status */}
          <WorkflowIconContainer>
            {getWorkflowStatusIcon(workflow.status)}
          </WorkflowIconContainer>

          {/* Workflow information */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {/* Workflow name */}
            <Typography
              variant="body1"
              component="div"
              fontWeight={600}
              noWrap
              title={workflow.name}
              sx={{
                lineHeight: 1.4,
                color: "text.primary",
              }}
            >
              {workflow.name}
            </Typography>

            {/* Creator + date + time */}
            <MetadataRow>
              <MetadataItem>
                <PersonOutlineIcon />

                <Typography
                  variant="caption"
                  component="span"
                  noWrap
                  title={creator}
                  sx={{
                    maxWidth: {
                      xs: 120,
                      sm: 180,
                      md: 240,
                    },
                  }}
                >
                  {creator}
                </Typography>
              </MetadataItem>

              {submittedDate && (
                <>
                  <MetadataSeparator>·</MetadataSeparator>

                  <Tooltip title={fullSubmittedDateTime ?? ""} arrow>
                    <MetadataItem>
                      <CalendarTodayOutlinedIcon />

                      <Typography variant="caption" component="span" noWrap>
                        {submittedDate}
                      </Typography>
                    </MetadataItem>
                  </Tooltip>
                </>
              )}

              {submittedTime && (
                <>
                  <MetadataSeparator>·</MetadataSeparator>

                  <Tooltip title={fullSubmittedDateTime ?? ""} arrow>
                    <MetadataItem>
                      <AccessTimeOutlinedIcon />

                      <Typography variant="caption" component="span" noWrap>
                        {submittedTime}
                      </Typography>
                    </MetadataItem>
                  </Tooltip>
                </>
              )}
            </MetadataRow>
          </Box>

          {/* Actions */}
          <WorkflowActions
            onClick={(event) => {
              event.stopPropagation();
            }}
            onFocus={(event) => {
              event.stopPropagation();
            }}
          >
            {workflowLink && (
              <Tooltip title="Open workflow in a new tab">
                <IconButton
                  component={Link}
                  to={workflowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  aria-label={`Open workflow ${workflow.name} in a new tab`}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  sx={{
                    color: "text.secondary",

                    "&:hover": {
                      color: "primary.main",
                    },
                  }}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {RetriggerComponent && (
              <RetriggerComponent
                instrumentSession={workflow.instrumentSession}
                workflowId={workflow.id}
              />
            )}

            {GithubComponent && (
              <GithubComponent
                instrumentSession={workflow.instrumentSession}
                workflowId={workflow.id}
              />
            )}
          </WorkflowActions>
        </Box>
      </WorkflowHeader>

      <AccordionDetails id={`workflow-${workflow.id}-content`}>
        {children}
      </AccordionDetails>
    </WorkflowCard>
  );
};

export default WorkflowAccordion;
