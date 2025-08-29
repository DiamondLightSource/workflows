use std::collections::HashSet;

use async_graphql::{Enum, InputObject};
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

#[cfg(test)]
mod tests {
    use crate::graphql::filters::{ScienceGroup, WorkflowTemplatesFilter};

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
}
