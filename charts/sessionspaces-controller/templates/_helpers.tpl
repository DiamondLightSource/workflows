{{- define "sessionspaces-controller.webhook.fullname" -}}
{{ printf "%s-webhook" (include "common.names.fullname" $) }}
{{- end }}

{{- define "sessionspaces-controller.api.fullname" -}}
{{ printf "%s-api" (include "common.names.fullname" $) }}
{{- end }}

{{- define "sessionspaces-controller.webhook.labels" -}}
{{ include "common.labels.standard" $ }}
app.kubernetes.io/component: webhook
{{- end }}

{{- define "sessionspaces-controller.api.labels" -}}
{{ include "common.labels.standard" $ }}
app.kubernetes.io/component: api
{{- end }}

{{- define "sessionspaces-controller.webhook.matchLabels" -}}
{{ include "common.labels.matchLabels" $ }}
app.kubernetes.io/component: webhook
{{- end }}

{{- define "sessionspaces-controller.api.matchLabels" -}}
{{ include "common.labels.matchLabels" $ }}
app.kubernetes.io/component: api
{{- end }}
