use async_graphql::InputObject;
use url::Url;

/// Build labels to apply query to workflows API
pub trait GraphFilter {
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
    science_group: Option<ScienceGroup>,
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
#[derive(InputObject, Debug, Default, Clone)]
pub struct ScienceGroup {
    /// MX Group
    mx: Option<bool>,
    /// Crystallography Group
    crystallography: Option<bool>,
    /// Magnetic Materials Group
    magnetic_materials: Option<bool>,
    /// Examples Group
    examples: Option<bool>,
}

impl GraphFilter for ScienceGroup {
    fn generate_labels(&self, labels: &mut Vec<String>) {
        let label_prefix = "workflows.diamond.ac.uk/science-group-";

        let fields = [
            ("mx", self.mx),
            ("crystallography", self.crystallography),
            ("magnetic-materials", self.magnetic_materials),
            ("examples", self.examples),
        ];

        for (name, value) in fields {
            if value == Some(true) {
                labels.push(format!("{label_prefix}{name}=true"));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::graphql::filters::{ScienceGroup, WorkflowTemplatesFilter};

    #[tokio::test]
    async fn science_group_filter() {
        let science_group = ScienceGroup {
            examples: Some(true),
            mx: None,
            crystallography: None,
            magnetic_materials: None,
        };
        let filters = WorkflowTemplatesFilter {
            science_group: Some(science_group),
        };
        let label_selectors = filters.create_label_selection();
        assert_eq!(
            label_selectors,
            "workflows.diamond.ac.uk/science-group-examples=true"
        );

        let science_group = ScienceGroup {
            examples: Some(true),
            mx: Some(true),
            crystallography: None,
            magnetic_materials: None,
        };
        let filters = WorkflowTemplatesFilter {
            science_group: Some(science_group),
        };
        let label_selectors = filters.create_label_selection();
        assert_eq!(label_selectors, "workflows.diamond.ac.uk/science-group-mx=true,workflows.diamond.ac.uk/science-group-examples=true");

        let science_group = ScienceGroup {
            examples: Some(true),
            mx: Some(false),
            crystallography: None,
            magnetic_materials: None,
        };
        let filters = WorkflowTemplatesFilter {
            science_group: Some(science_group),
        };
        let label_selectors = filters.create_label_selection();
        assert_eq!(
            label_selectors,
            "workflows.diamond.ac.uk/science-group-examples=true"
        );
    }
}
