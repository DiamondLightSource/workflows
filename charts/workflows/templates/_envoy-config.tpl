{{/*
The Envoy static config that the injected `workflows-auth-init` init container
writes to /etc/envoy/envoy.yaml. Kept here as a single source of truth and
injected into the MutatingAdmissionPolicy CEL expression via `include ... | toJson`.
*/}}
{{- define "workflows.envoyConfig" -}}
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
    allow_paths:
    - exact: /ready
  static_resources:
    listeners:
    - name: envoy-local-graph-proxy
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 6000
      filter_chains:
      - filters:
        - name: envoy.filters.network.http_connection_manager
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            stat_prefix: envoy-local-graph-proxy
            codec_type: AUTO
            upgrade_configs:
              - upgrade_type: websocket
            route_config:
              name: local_route
              virtual_hosts:
              - name: graph_backend
                domains:
                - "*"
                routes:
                  - match:
                      prefix: "/graphql/ws"
                    route:
                      cluster: graph-upstream
                      timeout: 0s
                      host_rewrite_literal: {{ .Values.authenticatedWorkflows.envoy.graphAddress | quote }}
                      upgrade_configs:
                        - upgrade_type: websocket
                          enabled: true
                    typed_per_filter_config:
                      envoy.filters.http.ext_authz:
                        "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthzPerRoute
                        disabled: false
                  - match:
                      prefix: "/"
                    route:
                      cluster: graph-upstream
                      timeout: 30s
                      host_rewrite_literal: {{ .Values.authenticatedWorkflows.envoy.graphAddress | quote }}
                    typed_per_filter_config:
                      envoy.filters.http.ext_authz:
                        "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthzPerRoute
                        disabled: false
            http_filters:
            # Add the Pod service account token to send to auth broker
            - name: envoy.filters.http.lua
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
                default_source_code:
                  inline_string: |
                    function envoy_on_request(request_handle)
                      local token_path = "/var/run/secrets/workflows-auth-broker-token/token"

                      request_handle:logInfo("lua: reading Kubernetes service account token")

                      if io == nil or io.open == nil then
                        request_handle:logErr("lua: io.open is not available in this Envoy Lua runtime")
                        return
                      end

                      local ok, file_or_err = pcall(io.open, token_path, "r")

                      if not ok then
                        request_handle:logErr("lua: io.open raised error: " .. tostring(file_or_err))
                        return
                      end

                      local f = file_or_err

                      if f == nil then
                        request_handle:logErr("lua: failed to open service account token file: " .. token_path)
                        return
                      end

                      local token = f:read("*a")
                      f:close()

                      if token == nil or token == "" then
                        request_handle:logErr("lua: service account token file was empty")
                        return
                      end

                      token = string.gsub(token, "%s+$", "")

                      request_handle:headers():replace(
                        "k8s-pod-service-account-token",
                        token
                      )

                      request_handle:logInfo("lua: added k8s-pod-service-account-token header")
                    end

            # Request access token from auth-broker
            - name: envoy.filters.http.ext_authz
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
                transport_api_version: V3

                allowed_headers:
                  patterns:
                  - exact: "k8s-pod-service-account-token"
                  - exact: "content-type"
                  - exact: "authorization"
                  - exact: "host"

                http_service:
                  server_uri:
                    uri: {{ .Values.authenticatedWorkflows.envoy.authBrokerServerUri | quote }}
                    cluster: auth-broker
                    timeout: 5s
                  authorization_response:
                    allowed_upstream_headers:
                      patterns:
                      - exact: "authorization"

            # Remove pod service token so that it is not sent outside the cluster to the GraphQL server
            - name: envoy.filters.http.lua
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
                default_source_code:
                  inline_string: |
                    function envoy_on_request(request_handle)
                      request_handle:headers():remove("k8s-pod-service-account-token")
                    end

            - name: envoy.filters.http.router
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

    # A second listener on port 6001 (envoy-local-tiled-proxy) applies the same
    # filter chain and forwards requests to tiled-upstream, so authenticated
    # workflows can reach Tiled via TILED_URL (http://127.0.0.1:6001).
    - name: envoy-local-tiled-proxy
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 6001
      filter_chains:
      - filters:
        - name: envoy.filters.network.http_connection_manager
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            stat_prefix: envoy-local-tiled-proxy
            codec_type: AUTO
            upgrade_configs:
              - upgrade_type: websocket
            route_config:
              name: tiled_route
              virtual_hosts:
              - name: tiled_backend
                domains:
                - "*"
                # Tiled builds self-referencing links in its responses from the
                # X-Forwarded-Host header (see
                # https://blueskyproject.io/tiled/user-guide/serve-behind-reverse-proxy.html).
                # Point them back at the local Envoy sidecar so the Tiled client keeps
                # going through the proxy
                request_headers_to_add:
                  - header:
                      key: X-Forwarded-Host
                      value: "127.0.0.1:6001"
                routes:
                  - match:
                      prefix: "/"
                    route:
                      cluster: tiled-upstream
                      timeout: 30s
                      host_rewrite_literal: {{ .Values.authenticatedWorkflows.envoy.tiledAddress | quote }}
                    typed_per_filter_config:
                      envoy.filters.http.ext_authz:
                        "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthzPerRoute
                        disabled: false
            http_filters:
            # Add the Pod service account token to send to auth broker
            - name: envoy.filters.http.lua
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
                default_source_code:
                  inline_string: |
                    function envoy_on_request(request_handle)
                      local token_path = "/var/run/secrets/workflows-auth-broker-token/token"

                      request_handle:logInfo("lua: reading Kubernetes service account token")

                      if io == nil or io.open == nil then
                        request_handle:logErr("lua: io.open is not available in this Envoy Lua runtime")
                        return
                      end

                      local ok, file_or_err = pcall(io.open, token_path, "r")

                      if not ok then
                        request_handle:logErr("lua: io.open raised error: " .. tostring(file_or_err))
                        return
                      end

                      local f = file_or_err

                      if f == nil then
                        request_handle:logErr("lua: failed to open service account token file: " .. token_path)
                        return
                      end

                      local token = f:read("*a")
                      f:close()

                      if token == nil or token == "" then
                        request_handle:logErr("lua: service account token file was empty")
                        return
                      end

                      token = string.gsub(token, "%s+$", "")

                      request_handle:headers():replace(
                        "k8s-pod-service-account-token",
                        token
                      )

                      request_handle:logInfo("lua: added k8s-pod-service-account-token header")
                    end

            # Request access token from auth-broker
            - name: envoy.filters.http.ext_authz
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
                transport_api_version: V3

                allowed_headers:
                  patterns:
                  - exact: "k8s-pod-service-account-token"
                  - exact: "content-type"
                  - exact: "authorization"
                  - exact: "host"

                http_service:
                  server_uri:
                    uri: {{ .Values.authenticatedWorkflows.envoy.authBrokerServerUri | quote }}
                    cluster: auth-broker
                    timeout: 5s
                  authorization_response:
                    allowed_upstream_headers:
                      patterns:
                      - exact: "authorization"

            # Remove pod service token so that it is not sent outside the cluster to the GraphQL server
            - name: envoy.filters.http.lua
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
                default_source_code:
                  inline_string: |
                    function envoy_on_request(request_handle)
                      request_handle:headers():remove("k8s-pod-service-account-token")
                    end

            - name: envoy.filters.http.router
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

    clusters:
    - name: graph-upstream
      connect_timeout: 5s
      type: LOGICAL_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: graph-upstream
        endpoints:
        - lb_endpoints:
          - endpoint:
              address:
                socket_address:
                  address: {{ .Values.authenticatedWorkflows.envoy.graphAddress | quote }}
                  port_value: {{ .Values.authenticatedWorkflows.envoy.graphPort }}
      {{- if .Values.authenticatedWorkflows.envoy.tls.enabled }}
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
          sni: {{ .Values.authenticatedWorkflows.envoy.graphAddress | quote }}
      {{- end }}

    - name: tiled-upstream
      connect_timeout: 5s
      type: LOGICAL_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: tiled-upstream
        endpoints:
        - lb_endpoints:
          - endpoint:
              address:
                socket_address:
                  address: {{ .Values.authenticatedWorkflows.envoy.tiledAddress | quote }}
                  port_value: {{ .Values.authenticatedWorkflows.envoy.tiledPort }}
      {{- if .Values.authenticatedWorkflows.envoy.tls.enabled }}
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
          sni: {{ .Values.authenticatedWorkflows.envoy.tiledAddress | quote }}
      {{- end }}

    - name: auth-broker
      connect_timeout: 5s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: auth-broker
        endpoints:
        - lb_endpoints:
          - endpoint:
              address:
                socket_address:
                  address: {{ .Values.authenticatedWorkflows.envoy.authBrokerServerSocketAddress | quote }}
                  port_value: {{ .Values.authenticatedWorkflows.envoy.authBrokerServerSocketPort }}
{{- end }}
