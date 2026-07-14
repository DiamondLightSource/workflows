use std::collections::HashSet;

use async_graphql::{
    Enum, InputObject, InputValueError, InputValueResult, Scalar, ScalarType, Value,
};
use url::Url;

/// Build labels to apply query to workflows API
trait GraphFilter {
    /// Generate Argo Workflows label filters
    fn generate_labels(&self, labels: &mut Vec<String>);
}

impl<T> GraphFilter for Option<T>
where
    T: GraphFilter,
{
    fn generate_labels(&self, labels: &mut Vec<String>) {
        if let Some(filter) = self {
            filter.generate_labels(labels);
        }
    }
}

// TEMPLATES--------------------------------------------

/// Supported label filters for ClusterWorkflowTemplates
#[derive(Debug, Default, Clone, InputObject)]
pub struct WorkflowTemplatesFilter {
    /// The science group owning the template eg imaging
    science_group: Option<Vec<ScienceGroup>>,
}

impl WorkflowTemplatesFilter {
    /// Generates and applies all the filters
    pub fn generate_filters(&self, url: &mut Url) {
        let labels = &self.create_label_selection();
        url.query_pairs_mut()
            .append_pair("listOptions.labelSelector", labels);
    }

    /// Creates string of requested labels
    fn create_label_selection(&self) -> String {
        let mut label_selectors = Vec::new();

        self.science_group.generate_labels(&mut label_selectors);

        label_selectors.join(",")
    }
}

/// Supported DLS science groups
#[derive(Enum, Copy, Clone, Eq, PartialEq, Debug, Hash)]
pub enum ScienceGroup {
    /// Macromolecular Crystallography
    Mx,
    /// Workflows Examples
    Examples,
    /// Magnetic Materials
    MagneticMaterials,
    /// Soft Condensed Matter
    CondensedMatter,
    /// Imaging and Microscopy
    Imaging,
    /// Biological Cryo-Imaging
    BioCryoImaging,
    /// Structures and Surfaces
    Surfaces,
    /// Crystallography
    Crystallography,
    /// Spectroscopy
    Spectroscopy,
}

impl GraphFilter for Vec<ScienceGroup> {
    fn generate_labels(&self, labels: &mut Vec<String>) {
        let label_prefix = "workflows.diamond.ac.uk/science-group-";
        let unique_groups: HashSet<&ScienceGroup> = self.iter().collect();

        for group in unique_groups {
            let key = match group {
                ScienceGroup::Mx => "mx",
                ScienceGroup::Crystallography => "crystallography",
                ScienceGroup::MagneticMaterials => "magnetic-materials",
                ScienceGroup::Examples => "examples",
                ScienceGroup::BioCryoImaging => "bio-cryo-imaging",
                ScienceGroup::CondensedMatter => "condensed-matter",
                ScienceGroup::Spectroscopy => "spectroscopy",
                ScienceGroup::Imaging => "imaging",
                ScienceGroup::Surfaces => "surfaces",
            };
            labels.push(format!("{label_prefix}{key}=true"));
        }
    }
}

#[derive(Enum, Copy, Clone, Eq, PartialEq, Debug)]
#[graphql(name = "WorkflowLabelSelectorOperator")]
/// Supported operators for label selection in workflows
pub enum WorkflowLabelSelectorOperator {
    /// Match resources with an exact label value.
    Eq,
    /// Match resources with a label value that is not equal to a specified value.
    Ne,
    /// Match resources with a label value in a set of values.
    In,
    /// Match resources with a label value not in a set of values.
    NotIn,
    /// Match resources that have a specific label key, regardless of its value.
    Exists,
    /// Match resources that do not have a specific label key.
    DoesNotExist,
}

/// Represents a label selector for filtering workflows based on labels
#[derive(Debug, Clone, InputObject)]
/// Represents a label selector for filtering workflows based on labels
pub struct LabelSelector {
    /// The label key to filter on
    key: String,
    /// The operator to use for the label selection
    operator: WorkflowLabelSelectorOperator,
    /// The values to match against the label key (if applicable)
    values: Option<Vec<String>>,
}

// Workflows--------------------------------------------

/// All the supported Workflows filters
#[derive(Debug, Default, Clone, InputObject)]
pub struct WorkflowFilter {
    /// The status of the workflow (e.g., pending, running, succeeded, failed, error)
    workflow_status_filter: Option<WorkflowStatusFilter>,
    /// The fedid of the user who created the workflow
    creator: Option<Creator>,
    /// The workflow template
    template: Option<Template>,
    /// Additional label selectors for filtering workflows
    #[graphql(name = "labelSelectors")]
    /// Additional label selectors for filtering workflows
    labels: Option<Vec<LabelSelector>>,
}

impl WorkflowFilter {
    /// Generates and applies all the filters
    pub fn generate_filters(&self, url: &mut Url) {
        let labels = &self.create_label_selection();
        url.query_pairs_mut()
            .append_pair("listOptions.labelSelectors", labels);
    }

    /// Creates a string of all the reqested filters that belong to the
    /// `labelSelectors` query key in the Workflow API
    fn create_label_selection(&self) -> String {
        let mut label_selectors = Vec::new();

        self.workflow_status_filter
            .generate_labels(&mut label_selectors);

        self.creator.generate_labels(&mut label_selectors);

        self.template.generate_labels(&mut label_selectors);

        self.labels.generate_labels(&mut label_selectors);
        label_selectors.join(",")
    }
}

/// Represents workflow status filters
#[allow(clippy::missing_docs_in_private_items)]
#[derive(Debug, Default, Clone, InputObject)]
struct WorkflowStatusFilter {
    #[graphql(default = false)]
    pending: bool,
    #[graphql(default = false)]
    running: bool,
    #[graphql(default = false)]
    succeeded: bool,
    #[graphql(default = false)]
    failed: bool,
    #[graphql(default = false)]
    error: bool,
}

#[allow(clippy::missing_docs_in_private_items)]
impl WorkflowStatusFilter {
    pub fn is_enabled(&self) -> bool {
        self.pending || self.running || self.succeeded || self.failed || self.error
    }

    fn to_phases(&self) -> Vec<&'static str> {
        let mut phases = Vec::new();
        if self.pending {
            phases.push("Pending");
        }
        if self.running {
            phases.push("Running");
        }
        if self.succeeded {
            phases.push("Succeeded");
        }
        if self.failed {
            phases.push("Failed");
        }
        if self.error {
            phases.push("Error");
        }
        phases
    }
}

impl GraphFilter for WorkflowStatusFilter {
    fn generate_labels(&self, labels: &mut Vec<String>) {
        if self.is_enabled() {
            let status_label = format!(
                "workflows.argoproj.io/phase in ({})",
                self.to_phases().join(", ")
            );
            labels.push(status_label);
        }
    }
}

/// The fedid of the user who created the workflow
#[derive(Debug, Clone, PartialEq, Eq)]
struct Creator(String);

#[Scalar]
impl ScalarType for Creator {
    fn parse(value: Value) -> InputValueResult<Self> {
        match value {
            Value::String(s) => Ok(Creator(s)),
            _ => Err(InputValueError::expected_type(value)),
        }
    }

    fn to_value(&self) -> Value {
        Value::String(self.0.clone())
    }
}

impl GraphFilter for Creator {
    fn generate_labels(&self, labels: &mut Vec<String>) {
        let label = format!(
            "workflows.argoproj.io/creator-preferred-username={}",
            self.0
        );
        labels.push(label);
    }
}

/// The workflow template
#[derive(Debug, Clone, PartialEq, Eq)]
struct Template(String);

#[Scalar]
impl ScalarType for Template {
    fn parse(value: Value) -> InputValueResult<Self> {
        match value {
            Value::String(s) => Ok(Template(s)),
            _ => Err(InputValueError::expected_type(value)),
        }
    }

    fn to_value(&self) -> Value {
        Value::String(self.0.clone())
    }
}

impl GraphFilter for Template {
    fn generate_labels(&self, labels: &mut Vec<String>) {
        let label = format!("workflows.argoproj.io/cluster-workflow-template={}", self.0);
        labels.push(label);
    }
}

impl GraphFilter for Vec<LabelSelector> {
    fn generate_labels(&self, labels: &mut Vec<String>) {
        for selector in self {
            labels.push(selector.to_label_selector());
        }
    }
}

impl LabelSelector {
    /// Converts the LabelSelector into a string representation suitable for use in a label selector query
    fn to_label_selector(&self) -> String {
        match self.operator {
            WorkflowLabelSelectorOperator::Eq => {
                format!(
                    "{}={}",
                    self.key,
                    self.values.as_ref().expect("EQ requires value")[0]
                )
            }

            WorkflowLabelSelectorOperator::Ne => {
                format!(
                    "{}!={}",
                    self.key,
                    self.values.as_ref().expect("NE requires value")[0]
                )
            }

            WorkflowLabelSelectorOperator::In => {
                format!(
                    "{} in ({})",
                    self.key,
                    self.values.as_ref().expect("IN requires values").join(", ")
                )
            }

            WorkflowLabelSelectorOperator::NotIn => {
                format!(
                    "{} notin ({})",
                    self.key,
                    self.values
                        .as_ref()
                        .expect("NOT_IN requires values")
                        .join(", ")
                )
            }

            WorkflowLabelSelectorOperator::Exists => self.key.clone(),

            WorkflowLabelSelectorOperator::DoesNotExist => {
                format!("!{}", self.key)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::graphql::filters::{
        Creator, LabelSelector, WorkflowLabelSelectorOperator, ScienceGroup, Template, WorkflowFilter,
        WorkflowStatusFilter, WorkflowTemplatesFilter,
    };

    // TEMPLATES--------------------------------------------
    #[tokio::test]
    async fn science_group_filter() {
        let science_groups = vec![ScienceGroup::Examples];
        let filters = WorkflowTemplatesFilter {
            science_group: Some(science_groups),
        };
        let label_selectors = filters.create_label_selection();
        assert_eq!(
            label_selectors,
            "workflows.diamond.ac.uk/science-group-examples=true"
        );

        let science_groups = vec![ScienceGroup::Examples];
        let filters = WorkflowTemplatesFilter {
            science_group: Some(science_groups),
        };
        let label_selectors = filters.create_label_selection();
        assert_eq!(
            label_selectors,
            "workflows.diamond.ac.uk/science-group-examples=true"
        );
    }

    #[tokio::test]
    async fn multiple_groups() {
        let science_groups = vec![ScienceGroup::Examples, ScienceGroup::Mx];
        let filters = WorkflowTemplatesFilter {
            science_group: Some(science_groups),
        };
        let label_selectors = filters.create_label_selection();

        let output_groups: Vec<&str> = label_selectors.split(",").collect();

        assert!(output_groups.contains(&"workflows.diamond.ac.uk/science-group-mx=true"));
        assert!(output_groups.contains(&"workflows.diamond.ac.uk/science-group-examples=true"));
        assert_eq!(output_groups.len(), 2);
    }

    #[tokio::test]
    async fn duplicate_groups() {
        let science_groups = vec![ScienceGroup::Examples, ScienceGroup::Examples];
        let filters = WorkflowTemplatesFilter {
            science_group: Some(science_groups),
        };
        let label_selectors = filters.create_label_selection();
        assert_eq!(
            label_selectors,
            "workflows.diamond.ac.uk/science-group-examples=true"
        );
    }

    #[tokio::test]
    async fn label_eq_filter() {
        let filters = WorkflowFilter {
            creator: None,
            template: None,
            workflow_status_filter: None,
            labels: Some(vec![LabelSelector {
                key: "beamline".to_string(),
                operator: WorkflowLabelSelectorOperator::Eq,
                values: Some(vec!["i14".to_string()]),
            }]),
        };

        assert_eq!(filters.create_label_selection(), "beamline=i14");
    }

    #[tokio::test]
    async fn label_combined_with_existing_filters() {
        let creator = Creator("test".to_string());

        let filters = WorkflowFilter {
            creator: Some(creator),
            template: None,
            workflow_status_filter: None,
            labels: Some(vec![LabelSelector {
                key: "beamline".to_string(),
                operator: WorkflowLabelSelectorOperator::Eq,
                values: Some(vec!["i14".to_string()]),
            }]),
        };

        assert_eq!(
            filters.create_label_selection(),
            "workflows.argoproj.io/creator-preferred-username=test,beamline=i14"
        );
    }

    #[tokio::test]
    async fn label_filter() {
        let filters = WorkflowFilter {
            creator: None,
            template: None,
            workflow_status_filter: None,
            labels: Some(vec![LabelSelector {
                key: "beamline".to_string(),
                operator: WorkflowLabelSelectorOperator::Eq,
                values: Some(vec!["i14".to_string()]),
            }]),
        };

        assert_eq!(filters.create_label_selection(), "beamline=i14");
    }

    // Workflows--------------------------------------------
    #[tokio::test]
    async fn creator() {
        let creator = Creator("test".to_string());
        let filters = WorkflowFilter {
            creator: Some(creator),
            template: None,
            workflow_status_filter: None,
            labels: None,
        };

        let labels = filters.create_label_selection();
        assert_eq!(
            labels,
            "workflows.argoproj.io/creator-preferred-username=test"
        );
    }

    #[tokio::test]
    async fn phase() {
        let creator = Creator("test".to_string());
        let phases = WorkflowStatusFilter {
            error: false,
            failed: false,
            pending: false,
            succeeded: false,
            running: true,
        };
        let filters = WorkflowFilter {
            creator: Some(creator),
            template: None,
            workflow_status_filter: Some(phases),
            labels: None,
        };

        let labels = filters.create_label_selection();
        assert_eq!(labels, "workflows.argoproj.io/phase in (Running),workflows.argoproj.io/creator-preferred-username=test");
    }

    #[tokio::test]
    async fn multi_phase() {
        let creator = Creator("test".to_string());
        let phases = WorkflowStatusFilter {
            error: false,
            failed: true,
            pending: false,
            succeeded: false,
            running: true,
        };
        let filters = WorkflowFilter {
            creator: Some(creator),
            template: None,
            workflow_status_filter: Some(phases),
            labels: None,
        };

        let labels = filters.create_label_selection();
        assert_eq!(labels, "workflows.argoproj.io/phase in (Running, Failed),workflows.argoproj.io/creator-preferred-username=test");
    }

    #[tokio::test]
    async fn creator_phase_template() {
        let creator = Creator("test".to_string());
        let phases = WorkflowStatusFilter {
            error: false,
            failed: false,
            pending: false,
            succeeded: false,
            running: true,
        };
        let template = Template("template-name".to_string());

        let filters = WorkflowFilter {
            creator: Some(creator),
            template: Some(template),
            workflow_status_filter: Some(phases),
            labels: None,
        };

        let labels = filters.create_label_selection();
        assert_eq!(labels, "workflows.argoproj.io/phase in (Running),workflows.argoproj.io/creator-preferred-username=test,workflows.argoproj.io/cluster-workflow-template=template-name");
    }
}
