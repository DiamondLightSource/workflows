/// The config map for kyverno policy
mod config_maps;
/// The Namespace for a beamline session
mod namespace;

/// The app.kubernetes.io/managed-by label
const MANAGED_BY_LABEL: &str = "app.kubernetes.io/managed-by";
/// The value to be used in app.kubernetes.io/managed-by labels
const MANAGED_BY: &str = "sessionspaces";

/// Beamlines that has the path structure /dls/beamline/data/year/session
const BL_WITH_PATH: [&str; 62] = [
    "b07", "b07-1", "b16", "b18", "b21", "b22", "b23", "i03", "i04", "i04-1", "i05", "i05-1",
    "i06", "i06-1", "i06-2", "i07", "i08", "i08-1", "i09", "i09-1", "i09-1", "i10", "i10-1", "i11",
    "i11-1", "i12", "i13", "i13-1", "i14", "i14-1", "i15", "i15-1", "i16", "i18", "i19", "i19-1",
    "i19-2", "i20", "i21", "i22", "i23", "i24", "m01", "m02", "m03", "m04", "m05", "m06", "m07",
    "m08", "m10", "m11", "m12", "m13", "m14", "p02", "p29", "p32", "p33", "p38", "p45", "p99",
];

pub use self::{
    config_maps::create_configmap,
    namespace::{create_namespace, delete_namespace},
};
