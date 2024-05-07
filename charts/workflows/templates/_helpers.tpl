{{/*
Create a new password for the argo_workflows user in postgres
*/}}
{{- define "workflows.argoWorkflows.postgresPassword" }}
  {{- if not .Release.IsUpgrade }}
    {{- if not (index .Release "argoWorkflowsPostgresPassword" ) -}}
      {{- $_ := set .Release "argoWorkflowsPostgresPassword" (randAlphaNum 24) }}
    {{- end }}
    {{- index .Release "argoWorkflowsPostgresPassword" }}
  {{- else }}
    {{- index (lookup "v1" "Secret" .Release.Namespace "postgres-application-passwords").data "passwords" | b64dec }}
  {{- end }}
{{- end }}
