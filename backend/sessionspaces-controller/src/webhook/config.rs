//! Configuration for sessionspaces-webhook.

use anyhow::{Context, Result, bail};
use std::collections::HashSet;

/// The kinds of resource that can be copied into session namespaces.
#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq, serde::Deserialize)]
pub enum CopySourceKind {
    #[serde(rename = "Secret")]
    Secret,
    #[serde(rename = "ConfigMap")]
    ConfigMap,
}

impl CopySourceKind {
    /// The plural resource name used by the Metacontroller `relatedResources` rule
    /// and as the key under which observed children are grouped.
    pub fn as_resource(self) -> &'static str {
        match self {
            CopySourceKind::Secret => "secrets",
            CopySourceKind::ConfigMap => "configmaps",
        }
    }

    /// The `<Kind>.<group>` key under which Metacontroller groups observed children
    /// and related resources in the sync request.
    pub fn as_related_key(self) -> &'static str {
        match self {
            CopySourceKind::Secret => "Secret.v1",
            CopySourceKind::ConfigMap => "ConfigMap.v1",
        }
    }
}

/// A single source object to copy into each active session namespace.
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopySource {
    pub namespace: String,
    pub name: String,
    pub kind: CopySourceKind,
}

/// The webhook configuration deserialized from a YAML file.
#[derive(Debug, Clone, Default, serde::Deserialize)]
pub struct Config {
    #[serde(rename = "copySources", default)]
    pub copy_sources: Vec<CopySource>,
}

impl Config {
    /// Loads and validates the configuration from a YAML file.
    pub fn from_file(path: &str) -> Result<Self> {
        let contents =
            std::fs::read_to_string(path).with_context(|| format!("reading config from {path}"))?;
        let config: Config = serde_yaml::from_str(&contents)
            .with_context(|| format!("parsing config from {path}"))?;
        config.validate()?;
        Ok(config)
    }

    fn validate(&self) -> Result<()> {
        let mut seen = HashSet::new();
        for source in &self.copy_sources {
            if !seen.insert((source.kind, source.name.as_str())) {
                bail!(
                    "duplicate copy source (kind '{}', name '{}'): copied resources would collide in session namespaces",
                    source.kind.as_resource(),
                    source.name
                );
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static NEXT: AtomicUsize = AtomicUsize::new(0);

    fn write_temp(contents: &str) -> std::path::PathBuf {
        let path = std::env::temp_dir().join(format!(
            "copy-sources-{}-{}.yaml",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::SeqCst)
        ));
        std::fs::write(&path, contents).unwrap();
        path
    }

    #[test]
    fn parses_a_list_of_sources() {
        let path = write_temp(
            r#"
copySources:
  - namespace: workflows
    name: artifact-s3
    kind: Secret
  - namespace: workflows
    name: shared-config
    kind: ConfigMap
"#,
        );

        let config = Config::from_file(path.to_str().unwrap()).unwrap();

        assert_eq!(config.copy_sources.len(), 2);
        assert_eq!(config.copy_sources[0].namespace, "workflows");
        assert_eq!(config.copy_sources[0].name, "artifact-s3");
        assert_eq!(config.copy_sources[0].kind, CopySourceKind::Secret);
        assert_eq!(config.copy_sources[1].kind, CopySourceKind::ConfigMap);
    }

    #[test]
    fn rejects_duplicate_sources_of_the_same_kind() {
        let path = write_temp(
            r#"
copySources:
  - namespace: workflows
    name: artifact-s3
    kind: Secret
  - namespace: other
    name: artifact-s3
    kind: Secret
"#,
        );

        let error = Config::from_file(path.to_str().unwrap()).unwrap_err();

        assert!(
            error
                .to_string()
                .contains("duplicate copy source (kind 'secrets', name 'artifact-s3')")
        );
    }

    #[test]
    fn allows_the_same_name_across_kinds() {
        let path = write_temp(
            r#"
copySources:
  - namespace: workflows
    name: shared
    kind: Secret
  - namespace: workflows
    name: shared
    kind: ConfigMap
"#,
        );

        let config = Config::from_file(path.to_str().unwrap()).unwrap();

        assert_eq!(config.copy_sources.len(), 2);
    }

    #[test]
    fn rejects_an_unknown_kind() {
        let path = write_temp(
            r#"
copySources:
  - namespace: workflows
    name: artifact-s3
    kind: SecretMap
"#,
        );

        assert!(Config::from_file(path.to_str().unwrap()).is_err());
    }

    #[test]
    fn related_keys_and_resources_match() {
        assert_eq!(CopySourceKind::Secret.as_resource(), "secrets");
        assert_eq!(CopySourceKind::Secret.as_related_key(), "Secret.v1");
        assert_eq!(CopySourceKind::ConfigMap.as_resource(), "configmaps");
        assert_eq!(CopySourceKind::ConfigMap.as_related_key(), "ConfigMap.v1");
    }
}
