/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type GetTemplatesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTemplatesQuery = { workflowTemplates: { __typename: 'WorkflowTemplateConnection', nodes: Array<{ __typename: 'WorkflowTemplate', name: string, maintainer: string, title: string | null, description: string | null }> } };
