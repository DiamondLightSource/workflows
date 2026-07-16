{{- define "auth-broker.name" -}}
{{- default "auth-broker" .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "auth-broker.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default "auth-broker" .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "auth-broker.labels" -}}
helm.sh/chart: {{ include "auth-broker.name" . }}-{{ .Chart.Version | replace "+" "_" }}
{{ include "auth-broker.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "auth-broker.selectorLabels" -}}
app.kubernetes.io/name: {{ include "auth-broker.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
