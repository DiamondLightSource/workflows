{{/*
Produce initial cluster list for a supplied number of replicas
*/}}
{{- define "workflows.etcdInitialCluster" -}}
{{- $etcdReplicas := . -}}
{{- range $i, $e := until $etcdReplicas -}}
{{- if $i }},{{ end -}}
workflows-cluster-etcd-{{ $i }}=https://workflows-cluster-etcd-{{ $i }}.workflows-cluster-etcd-headless.workflows:2380
{{- end -}}
{{- end }}
