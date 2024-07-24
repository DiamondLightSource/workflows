{{/*
Create a new password for the argo_workflows user in postgres
*/}}
{{- define "workflows.argoWorkflowsPostgresPassword" }}
{{- $existing := (lookup "v1" "Secret" .Release.Namespace "postgres-application-passwords") }}
  {{- if $existing }}
    {{- index $existing.data "password" | b64dec }}
  {{- else }}
    {{- if not (index .Release "argoWorkflowsPostgresPassword" ) -}}
      {{- $_ := set .Release "argoWorkflowsPostgresPassword" (randAlphaNum 24) }}
    {{- end }}
    {{- index .Release "argoWorkflowsPostgresPassword" }}
  {{- end }}
{{- end }}
