{{/*
Create the database URL string
*/}}
{{- define "sessionspaces.databaseURL" -}}
{{- $host_parts := urlParse .Values.database.host }}
{{- $raw_user_info := printf "%s:$DATABASE_PASSWORD" .Values.database.user }}
{{- $url_parts := set $host_parts "userinfo" $raw_user_info }}
{{- $raw_database_url := urlJoin $url_parts }}
{{- replace "$DATABASE_PASSWORD" "$(DATABASE_PASSWORD)" $raw_database_url }}
{{- end }}
