use std::collections::HashSet;

use argo_workflows_openapi::IoArgoprojWorkflowV1alpha1Workflow;
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
pub struct LabelSelector {
    /// The label key to filter on
    key: String,
    /// The operator to use for the label selection
    operator: WorkflowLabelSelectorOperator,
    /// The values to match against the label key (if applicable)
    values: Option<Vec<String>>,
}

// Workflows--------------------------------------------

/// Represents a workflow parameter filter
#[derive(Debug, Clone, InputObject)]
pub struct WorkflowParameterFilter {
    /// The workflow parameter name
    key: String,

    /// The workflow parameter value
    value: String,
}

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
    labels: Option<Vec<LabelSelector>>,

    /// Workflow parameter key/value filters
    parameters: Option<Vec<WorkflowParameterFilter>>,
}

impl WorkflowFilter {
    /// Generates and applies all the filters
    pub fn generate_filters(&self, url: &mut Url) {
        let labels = &self.create_label_selection();
        url.query_pairs_mut()
            .append_pair("listOptions.labelSelector", labels);
    }

    /// Creates a string of all the requested filters that belong to the
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

    /// Returns true when the workflow matches all requested parameters.
    pub fn matches_parameters(&self, workflow: &IoArgoprojWorkflowV1alpha1Workflow) -> bool {
        let Some(filters) = &self.parameters else {
            return true;
        };

        let Some(arguments) = &workflow.spec.arguments else {
            return false;
        };

        filters.iter().all(|filter| {
            arguments.parameters.iter().any(|parameter| {
                parameter.name == filter.key
                    && parameter.value.as_deref() == Some(filter.value.as_str())
            })
        })
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
        Creator, LabelSelector, ScienceGroup, Template, WorkflowFilter,
        WorkflowLabelSelectorOperator, WorkflowParameterFilter, WorkflowStatusFilter,
        WorkflowTemplatesFilter,
    };

    use argo_workflows_openapi::{
        IoArgoprojWorkflowV1alpha1Arguments, IoArgoprojWorkflowV1alpha1Parameter,
        IoArgoprojWorkflowV1alpha1Workflow, IoArgoprojWorkflowV1alpha1WorkflowSpec,
    };

    fn workflow_with_parameters(
        parameters: Vec<(&str, &str)>,
    ) -> IoArgoprojWorkflowV1alpha1Workflow {
        IoArgoprojWorkflowV1alpha1Workflow {
            api_version: None,
            kind: None,
            metadata: Default::default(),
            spec: IoArgoprojWorkflowV1alpha1WorkflowSpec {
                arguments: Some(IoArgoprojWorkflowV1alpha1Arguments {
                    parameters: parameters
                        .into_iter()
                        .map(|(name, value)| IoArgoprojWorkflowV1alpha1Parameter {
                            default: None,
                            description: None,
                            enum_: vec![],
                            global_name: None,
                            name: name.to_string(),
                            value: Some(value.to_string()),
                            value_from: None,
                        })
                        .collect(),
                    ..Default::default()
                }),
                ..Default::default()
            },
            status: None,
        }
    }

    fn parameter_filter(key: &str, value: &str) -> WorkflowParameterFilter {
        WorkflowParameterFilter {
            key: key.to_string(),
            value: value.to_string(),
        }
    }

    /// tests ............................
    ///
    #[test]
    fn parameter_filter_matches_workflow_parameter() {
        let filter = WorkflowFilter {
            creator: None,
            template: None,
            workflow_status_filter: None,
            labels: None,
            parameters: Some(vec![parameter_filter("scan_number", "12345")]),
        };

        let workflow = workflow_with_parameters(vec![("scan_number", "12345")]);

        assert!(filter.matches_parameters(&workflow));
    }

    /// wrong Value
    #[test]
    fn parameter_filter_rejects_wrong_value() {
        let filter = WorkflowFilter {
            creator: None,
            template: None,
            workflow_status_filter: None,
            labels: None,
            parameters: Some(vec![parameter_filter("scan_number", "12345")]),
        };

        let workflow = workflow_with_parameters(vec![("scan_number", "99999")]);

        assert!(!filter.matches_parameters(&workflow));
    }

    /// Missing parameter
    #[test]
    fn parameter_filter_rejects_missing_parameter() {
        let filter = WorkflowFilter {
            creator: None,
            template: None,
            workflow_status_filter: None,
            labels: None,
            parameters: Some(vec![parameter_filter("scan_number", "12345")]),
        };

        let workflow = workflow_with_parameters(vec![("beamline", "i14")]);

        assert!(!filter.matches_parameters(&workflow));
    }

    /// No parameter filter
    ///
    #[test]
    fn no_parameter_filter_matches_any_workflow() {
        let filter = WorkflowFilter {
            creator: None,
            template: None,
            workflow_status_filter: None,
            labels: None,
            parameters: None,
        };

        let workflow = workflow_with_parameters(vec![("scan_number", "99999")]);

        assert!(filter.matches_parameters(&workflow));
    }

    /// Multiple parameter filters
    ///
    #[test]
    fn parameter_filters_require_all_parameters_to_match() {
        let filter = WorkflowFilter {
            creator: None,
            template: None,
            workflow_status_filter: None,
            labels: None,
            parameters: Some(vec![
                parameter_filter("scan_number", "12345"),
                parameter_filter("beamline", "i14"),
            ]),
        };

        let workflow =
            workflow_with_parameters(vec![("scan_number", "12345"), ("beamline", "i14")]);

        assert!(filter.matches_parameters(&workflow));
    }

    /// One parameter does not match
    #[test]
    fn parameter_filters_reject_when_one_parameter_does_not_match() {
        let filter = WorkflowFilter {
            creator: None,
            template: None,
            workflow_status_filter: None,
            labels: None,
            parameters: Some(vec![
                parameter_filter("scan_number", "12345"),
                parameter_filter("beamline", "i14"),
            ]),
        };

        let workflow =
            workflow_with_parameters(vec![("scan_number", "12345"), ("beamline", "i13")]);

        assert!(!filter.matches_parameters(&workflow));
    }

    /// workflow has no parameters
    ///
    #[test]
    fn parameter_filter_rejects_workflow_without_arguments() {
        let filter = WorkflowFilter {
            creator: None,
            template: None,
            workflow_status_filter: None,
            labels: None,
            parameters: Some(vec![parameter_filter("scan_number", "12345")]),
        };

        let workflow = IoArgoprojWorkflowV1alpha1Workflow {
            api_version: None,
            kind: None,
            metadata: Default::default(),
            spec: IoArgoprojWorkflowV1alpha1WorkflowSpec {
                arguments: None,
                ..Default::default()
            },
            status: None,
        };
        assert!(!filter.matches_parameters(&workflow));
    }

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
            parameters: None,
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
            parameters: None,
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
            parameters: None,
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
            parameters: None,
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
            parameters: None,
        };

        let labels = filters.create_label_selection();
        assert_eq!(
            labels,
            "workflows.argoproj.io/phase in (Running),workflows.argoproj.io/creator-preferred-username=test"
        );
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
            parameters: None,
        };

        let labels = filters.create_label_selection();
        assert_eq!(
            labels,
            "workflows.argoproj.io/phase in (Running, Failed),workflows.argoproj.io/creator-preferred-username=test"
        );
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
            parameters: None,
        };

        let labels = filters.create_label_selection();
        assert_eq!(
            labels,
            "workflows.argoproj.io/phase in (Running),workflows.argoproj.io/creator-preferred-username=test,workflows.argoproj.io/cluster-workflow-template=template-name"
        );
    }
}
