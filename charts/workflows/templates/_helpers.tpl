{{/*
Create a new password for the argo_workflows user in postgres
*/}}
{{- define "workflows.argoWorkflowsPostgresPassword" }}
{{- $existing := (lookup "v1" "Secret" .Release.Namespace "postgres-argo-workflows-password") }}
  {{- if $existing }}
    {{- index $existing.data "password" | b64dec }}
  {{- else }}
    {{- if not (index .Release "argoWorkflowsPostgresPassword" ) -}}
      {{- $_ := set .Release "argoWorkflowsPostgresPassword" (randAlphaNum 24) }}
    {{- end }}
    {{- index .Release "argoWorkflowsPostgresPassword" }}
  {{- end }}
{{- end }}
{{/*
Create a new password for the auth_user in postgres
*/}}
{{- define "workflows.authServicePostgresPassword" }}
{{- $existing := (lookup "v1" "Secret" .Release.Namespace "postgres-auth-service-password") }}
  {{- if $existing }}
    {{- index $existing.data "password" | b64dec }}
  {{- else }}
    {{- if not (index .Release "authServicePostgresPassword" ) -}}
      {{- $_ := set .Release "authServicePostgresPassword" (randAlphaNum 24) }}
    {{- end }}
    {{- index .Release "authServicePostgresPassword" }}
  {{- end }}
{{- end }}