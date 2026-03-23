use crate::instruments::Instrument;
use derive_more::{Deref, DerefMut};
use ldap3::{Ldap, LdapError, Scope, SearchEntry};
use std::{
    collections::{BTreeMap, BTreeSet},
    str::FromStr,
};
use strum::{EnumString, IntoEnumIterator};
use tracing::instrument;

/// A mapping of proposals to the subjects on them
#[derive(Debug, Default, Deref, DerefMut, PartialEq, Eq)]
pub struct InstrumentSubjects(BTreeMap<Instrument, BTreeSet<String>>);

#[derive(Debug, EnumString, PartialEq, Eq, PartialOrd, Ord)]
#[allow(clippy::missing_docs_in_private_items)]
enum InstrumentGroup {
    #[strum(serialize = "dls_dasc")]
    Dasc,
    #[strum(serialize = "b01_staff")]
    B01Staff,
    #[strum(serialize = "b01-1_staff")]
    B01_1Staff,
    #[strum(serialize = "b07_staff")]
    B07Staff,
    #[strum(serialize = "b16_staff")]
    B16Staff,
    #[strum(serialize = "b18_staff")]
    B18Staff,
    #[strum(serialize = "b21_staff")]
    B21Staff,
    #[strum(serialize = "b22_staff")]
    B22Staff,
    #[strum(serialize = "b23_staff")]
    B23Staff,
    #[strum(serialize = "b24_staff")]
    B24Staff,
    #[strum(serialize = "e01_staff")]
    E01Staff,
    #[strum(serialize = "e02_staff")]
    E02Staff,
    #[strum(serialize = "e03_staff")]
    E03Staff,
    #[strum(serialize = "i02-1_staff")]
    I02_1Staff,
    #[strum(serialize = "i02-2_staff")]
    I02_2Staff,
    #[strum(serialize = "i03_staff")]
    I03Staff,
    #[strum(serialize = "i04_staff")]
    I04Staff,
    #[strum(serialize = "i04-1_staff")]
    I04_1Staff,
    #[strum(serialize = "i05_staff")]
    I05Staff,
    #[strum(serialize = "i06_staff")]
    I06Staff,
    #[strum(serialize = "i07_staff")]
    I07Staff,
    #[strum(serialize = "i08_staff")]
    I08Staff,
    #[strum(serialize = "i09_staff")]
    I09Staff,
    #[strum(serialize = "i10_staff")]
    I10Staff,
    #[strum(serialize = "i11_staff")]
    I11Staff,
    #[strum(serialize = "i12_staff")]
    I12Staff,
    #[strum(serialize = "i13_staff")]
    I13Staff,
    #[strum(serialize = "i14_staff")]
    I14Staff,
    #[strum(serialize = "i15_staff")]
    I15Staff,
    #[strum(serialize = "i16_staff")]
    I16Staff,
    #[strum(serialize = "i18_staff")]
    I18Staff,
    #[strum(serialize = "i19_staff")]
    I19Staff,
    #[strum(serialize = "i20_staff")]
    I20Staff,
    #[strum(serialize = "i21_staff")]
    I21Staff,
    #[strum(serialize = "i22_staff")]
    I22Staff,
    #[strum(serialize = "i23_staff")]
    I23Staff,
    #[strum(serialize = "i24_staff")]
    I24Staff,
    #[strum(serialize = "k11_staff")]
    K11Staff,
    #[strum(serialize = "labxchem_staff")]
    LabxchemStaff,
    #[strum(serialize = "m01_staff")]
    M01Staff,
    #[strum(serialize = "m02_staff")]
    M02Staff,
    #[strum(serialize = "m03_staff")]
    M03Staff,
    #[strum(serialize = "m04_staff")]
    M04Staff,
    #[strum(serialize = "m05_staff")]
    M05Staff,
    #[strum(serialize = "m06_staff")]
    M06Staff,
    #[strum(serialize = "m07_staff")]
    M07Staff,
    #[strum(serialize = "m08_staff")]
    M08Staff,
    #[strum(serialize = "m10_staff")]
    M10Staff,
    #[strum(serialize = "m11_staff")]
    M11Staff,
    #[strum(serialize = "m12_staff")]
    M12Staff,
    #[strum(serialize = "m13_staff")]
    M13Staff,
    #[strum(serialize = "m14_staff")]
    M14Staff,
    #[strum(serialize = "p02_staff")]
    P02Staff,
    #[strum(serialize = "p29_staff")]
    P29Staff,
    #[strum(serialize = "p32_staff")]
    P32Staff,
    #[strum(serialize = "p33_staff")]
    P33Staff,
    #[strum(serialize = "p38_staff")]
    P38Staff,
    #[strum(serialize = "p45_staff")]
    P45Staff,
    #[strum(serialize = "p99_staff")]
    P99Staff,
    #[strum(serialize = "s01_staff")]
    S01Staff,
    #[strum(serialize = "s02_staff")]
    S02Staff,
    #[strum(serialize = "s03_staff")]
    S03Staff,
    #[strum(serialize = "s04_staff")]
    S04Staff,
}

impl InstrumentGroup {
    /// Provides a [`BTreeSet`] of [`Instrument`]s which a subject with a given [`InstrumentGroup`] can access
    fn allowed_instruments(self) -> BTreeSet<Instrument> {
        match self {
            Self::Dasc => Instrument::iter().collect(),
            Self::B01Staff => BTreeSet::from([Instrument::B01]),
            Self::B01_1Staff => BTreeSet::from([Instrument::B01_1]),
            Self::B07Staff => BTreeSet::from([Instrument::B07, Instrument::B07_1]),
            Self::B16Staff => BTreeSet::from([Instrument::B16]),
            Self::B18Staff => BTreeSet::from([Instrument::B18]),
            Self::B21Staff => BTreeSet::from([Instrument::B21]),
            Self::B22Staff => BTreeSet::from([Instrument::B22]),
            Self::B23Staff => BTreeSet::from([Instrument::B23]),
            Self::B24Staff => BTreeSet::from([Instrument::B24, Instrument::B24_1]),
            Self::E01Staff => BTreeSet::from([Instrument::E01]),
            Self::E02Staff => BTreeSet::from([Instrument::E02]),
            Self::E03Staff => BTreeSet::from([Instrument::E03]),
            Self::I02_1Staff => BTreeSet::from([Instrument::I02_1]),
            Self::I02_2Staff => BTreeSet::from([Instrument::I02_2]),
            Self::I03Staff => BTreeSet::from([Instrument::I03]),
            Self::I04Staff => BTreeSet::from([Instrument::I04]),
            Self::I04_1Staff => BTreeSet::from([Instrument::I04_1]),
            Self::I05Staff => BTreeSet::from([Instrument::I05, Instrument::I05_1]),
            Self::I06Staff => {
                BTreeSet::from([Instrument::I06, Instrument::I06_1, Instrument::I06_2])
            }
            Self::I07Staff => BTreeSet::from([Instrument::I07]),
            Self::I08Staff => BTreeSet::from([Instrument::I08, Instrument::I08_1]),
            Self::I09Staff => {
                BTreeSet::from([Instrument::I09, Instrument::I09_1, Instrument::I09_2])
            }
            Self::I10Staff => BTreeSet::from([Instrument::I10, Instrument::I10_1]),
            Self::I11Staff => BTreeSet::from([Instrument::I11, Instrument::I11_1]),
            Self::I12Staff => BTreeSet::from([Instrument::I12]),
            Self::I13Staff => BTreeSet::from([Instrument::I13, Instrument::I13_1]),
            Self::I14Staff => BTreeSet::from([Instrument::I14]),
            Self::I15Staff => BTreeSet::from([Instrument::I15, Instrument::I15_1]),
            Self::I16Staff => BTreeSet::from([Instrument::I16]),
            Self::I18Staff => BTreeSet::from([Instrument::I18]),
            Self::I19Staff => {
                BTreeSet::from([Instrument::I19, Instrument::I19_1, Instrument::I19_2])
            }
            Self::I20Staff => BTreeSet::from([Instrument::I20, Instrument::I20_1]),
            Self::I21Staff => BTreeSet::from([Instrument::I21]),
            Self::I22Staff => BTreeSet::from([Instrument::I22]),
            Self::I23Staff => BTreeSet::from([Instrument::I23]),
            Self::I24Staff => BTreeSet::from([Instrument::I24]),
            Self::K11Staff => BTreeSet::from([Instrument::K11]),
            Self::LabxchemStaff => BTreeSet::from([Instrument::LABXCHEM]),
            Self::M01Staff => BTreeSet::from([Instrument::M01]),
            Self::M02Staff => BTreeSet::from([Instrument::M02]),
            Self::M03Staff => BTreeSet::from([Instrument::M03]),
            Self::M04Staff => BTreeSet::from([Instrument::M04]),
            Self::M05Staff => BTreeSet::from([Instrument::M05]),
            Self::M06Staff => BTreeSet::from([Instrument::M06]),
            Self::M07Staff => BTreeSet::from([Instrument::M07]),
            Self::M08Staff => BTreeSet::from([Instrument::M08]),
            Self::M10Staff => BTreeSet::from([Instrument::M10]),
            Self::M11Staff => BTreeSet::from([Instrument::M11]),
            Self::M12Staff => BTreeSet::from([Instrument::M12]),
            Self::M13Staff => BTreeSet::from([Instrument::M13]),
            Self::M14Staff => BTreeSet::from([Instrument::M14]),
            Self::P02Staff => BTreeSet::from([Instrument::P02]),
            Self::P29Staff => BTreeSet::from([Instrument::P29]),
            Self::P32Staff => BTreeSet::from([Instrument::P32]),
            Self::P33Staff => BTreeSet::from([Instrument::P33]),
            Self::P38Staff => BTreeSet::from([Instrument::P38]),
            Self::P45Staff => BTreeSet::from([Instrument::P45]),
            Self::P99Staff => BTreeSet::from([Instrument::P99]),
            Self::S01Staff => BTreeSet::from([Instrument::S01]),
            Self::S02Staff => BTreeSet::from([Instrument::S02]),
            Self::S03Staff => BTreeSet::from([Instrument::S03]),
            Self::S04Staff => BTreeSet::from([Instrument::S04]),
        }
    }
}

impl InstrumentSubjects {
    /// Extract information from the LDAP cto get instrument-to-subject mappings
    /// Returns a mapping of instruments to user IDS who have access to those instruments
    #[instrument(name = "sessionspaces_fetch_instrument_subjects")]
    pub async fn fetch(ldap_connection: &mut Ldap) -> Result<Self, LdapError> {
        let mut instrument_subjects = Self::default();
        for result_entry in ldap_connection
            .search(
                "ou=Group,dc=diamond,dc=ac,dc=uk",
                Scope::Subtree,
                "objectclass=posixgroup",
                vec!["cn", "memberUid"],
            )
            .await?
            .success()?
            .0
        {
            let mut search_entry = SearchEntry::construct(result_entry);
            if let Ok(instruments) = Self::extract_instrument(&mut search_entry) {
                if let Some(subjects) = search_entry.attrs.remove("memberUid") {
                    for instrument in instruments {
                        instrument_subjects
                            .entry(instrument)
                            .or_default()
                            .extend(subjects.clone().into_iter());
                    }
                }
            }
        }
        Ok(instrument_subjects)
    }

    /// Extract a singular CN value from the group and try cast it into the [`Instrument`] of a known [`InstrumentGroup`]
    fn extract_instrument(
        search_entry: &mut SearchEntry,
    ) -> Result<BTreeSet<Instrument>, anyhow::Error> {
        let [cn] = search_entry
            .attrs
            .remove("cn")
            .ok_or(anyhow::anyhow!("CN was not present in group"))?
            .try_into()
            .map_err(|_| anyhow::anyhow!("CN was not singular"))?;
        let instrument_group = InstrumentGroup::from_str(&cn)?;
        Ok(instrument_group.allowed_instruments())
    }
}
