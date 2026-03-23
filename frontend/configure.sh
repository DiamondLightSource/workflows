#!/bin/sh
if [ -z "$SOURCE_DIR" ]; then
    echo "Source directory of HTML is not set"
    exit 1
fi

replace_placeholder() {
    local var_name="$1"
    local value=$(eval echo "\$$var_name")

    if [ -z "$value" ]; then
        echo "Environment variable for '$var_name' is not set"
        exit 1
    fi

    local placeholder="{{ $var_name }}"
    local sed_cmd="s|$placeholder|$value|g"

    grep -rl "$placeholder" "$SOURCE_DIR" | xargs -r sed -i "$sed_cmd"
}


replace_placeholder KEYCLOAK_URL
replace_placeholder KEYCLOAK_REALM
replace_placeholder KEYCLOAK_CLIENT
replace_placeholder KEYCLOAK_SCOPE
replace_placeholder GRAPH_URL
replace_placeholder GRAPH_WS_URL

nginx -g 'daemon off;'
