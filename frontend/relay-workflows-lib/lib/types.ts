import {
    workflowFragment$data } from "./graphql/__generated__/workflowFragment.graphql";

export type WorkflowStatusType = NonNullable<  workflowFragment$data["status"]>;
