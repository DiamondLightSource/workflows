//! Diamond instrument identifiers and their storage and access-group mappings.

use strum::{Display, EnumIter, EnumString};

/// Known Diamond instruments, parsed and displayed using their lowercase identifiers.
#[derive(Debug, Clone, Copy, Display, EnumString, EnumIter, PartialEq, Eq, PartialOrd, Ord)]
#[allow(missing_docs, clippy::upper_case_acronyms)]
#[repr(u8)]
pub enum Instrument {
    #[strum(serialize = "b01")]
    B01,
    #[strum(serialize = "b01-1")]
    B01_1,
    #[strum(serialize = "b07")]
    B07,
    #[strum(serialize = "b07-1")]
    B07_1,
    #[strum(serialize = "b16")]
    B16,
    #[strum(serialize = "b18")]
    B18,
    #[strum(serialize = "b21")]
    B21,
    #[strum(serialize = "b22")]
    B22,
    #[strum(serialize = "b23")]
    B23,
    #[strum(serialize = "b24")]
    B24,
    #[strum(serialize = "b24-1")]
    B24_1,
    #[strum(serialize = "e01")]
    E01,
    #[strum(serialize = "e02")]
    E02,
    #[strum(serialize = "e03")]
    E03,
    #[strum(serialize = "i02-1")]
    I02_1,
    #[strum(serialize = "i02-2")]
    I02_2,
    #[strum(serialize = "i03")]
    I03,
    #[strum(serialize = "i04")]
    I04,
    #[strum(serialize = "i04-1")]
    I04_1,
    #[strum(serialize = "i05")]
    I05,
    #[strum(serialize = "i05-1")]
    I05_1,
    #[strum(serialize = "i06")]
    I06,
    #[strum(serialize = "i06-1")]
    I06_1,
    #[strum(serialize = "i06-2")]
    I06_2,
    #[strum(serialize = "i07")]
    I07,
    #[strum(serialize = "i08")]
    I08,
    #[strum(serialize = "i08-1")]
    I08_1,
    #[strum(serialize = "i09")]
    I09,
    #[strum(serialize = "i09-1")]
    I09_1,
    #[strum(serialize = "i09-2")]
    I09_2,
    #[strum(serialize = "i10")]
    I10,
    #[strum(serialize = "i10-1")]
    I10_1,
    #[strum(serialize = "i11")]
    I11,
    #[strum(serialize = "i11-1")]
    I11_1,
    #[strum(serialize = "i12")]
    I12,
    #[strum(serialize = "i13")]
    I13,
    #[strum(serialize = "i13-1")]
    I13_1,
    #[strum(serialize = "i14")]
    I14,
    #[strum(serialize = "i15")]
    I15,
    #[strum(serialize = "i15-1")]
    I15_1,
    #[strum(serialize = "i16")]
    I16,
    #[strum(serialize = "i18")]
    I18,
    #[strum(serialize = "i19")]
    I19,
    #[strum(serialize = "i19-1")]
    I19_1,
    #[strum(serialize = "i19-2")]
    I19_2,
    #[strum(serialize = "i20")]
    I20,
    #[strum(serialize = "i20-1")]
    I20_1,
    #[strum(serialize = "i21")]
    I21,
    #[strum(serialize = "i22")]
    I22,
    #[strum(serialize = "i23")]
    I23,
    #[strum(serialize = "i24")]
    I24,
    #[strum(serialize = "k11")]
    K11,
    #[strum(serialize = "labxchem")]
    LABXCHEM,
    #[strum(serialize = "m01")]
    M01,
    #[strum(serialize = "m02")]
    M02,
    #[strum(serialize = "m03")]
    M03,
    #[strum(serialize = "m04")]
    M04,
    #[strum(serialize = "m05")]
    M05,
    #[strum(serialize = "m06")]
    M06,
    #[strum(serialize = "m07")]
    M07,
    #[strum(serialize = "m08")]
    M08,
    #[strum(serialize = "m10")]
    M10,
    #[strum(serialize = "m11")]
    M11,
    #[strum(serialize = "m12")]
    M12,
    #[strum(serialize = "m13")]
    M13,
    #[strum(serialize = "m14")]
    M14,
    #[strum(serialize = "p02")]
    P02,
    #[strum(serialize = "p29")]
    P29,
    #[strum(serialize = "p32")]
    P32,
    #[strum(serialize = "p33")]
    P33,
    #[strum(serialize = "p38")]
    P38,
    #[strum(serialize = "p45")]
    P45,
    #[strum(serialize = "p51")]
    P51,
    #[strum(serialize = "p99")]
    P99,
    #[strum(serialize = "s01")]
    S01,
    #[strum(serialize = "s02")]
    S02,
    #[strum(serialize = "s03")]
    S03,
    #[strum(serialize = "s04")]
    S04,
    #[strum(serialize = "t01")]
    T01,
}

impl Instrument {
    /// Computes the session data directory, or returns `None` for unsupported instruments.
    pub fn directory(self, year: i32, session_name: &str) -> Option<String> {
        use Instrument::*;
        match self {
            B01_1 | B07 | B07_1 | B16 | B18 | B21 | B22 | B23 | B24 | B24_1 | E01 | E02 | E03
            | I03 | I04 | I04_1 | I05 | I05_1 | I06 | I06_1 | I06_2 | I07 | I08 | I08_1 | I09
            | I09_1 | I09_2 | I10 | I10_1 | I11 | I11_1 | I12 | I13 | I13_1 | I14 | I15 | I15_1
            | I16 | I18 | I19 | I19_1 | I19_2 | I20 | I20_1 | I21 | I22 | I23 | I24 | K11 | M01
            | M02 | M03 | M04 | M05 | M06 | M07 | M08 | M10 | M11 | M12 | M13 | M14 | P02 | P29
            | P32 | P33 | P38 | P45 | P99 | S01 | S02 | S03 | S04 => {
                Some(format!("/dls/{self}/data/{year}/{session_name}"))
            }
            _ => None,
        }
    }

    /// LDAP groups whose members may access sessions on this instrument.
    pub fn ldap_groups(self) -> Vec<&'static str> {
        use Instrument::*;
        let staff = match self {
            B01 => "b01_staff",
            B01_1 => "b01-1_staff",
            B07 | B07_1 => "b07_staff",
            B16 => "b16_staff",
            B18 => "b18_staff",
            B21 => "b21_staff",
            B22 => "b22_staff",
            B23 => "b23_staff",
            B24 | B24_1 => "b24_staff",
            E01 => "e01_staff",
            E02 => "e02_staff",
            E03 => "e03_staff",
            I02_1 => "i02-1_staff",
            I02_2 => "i02-2_staff",
            I03 => "i03_staff",
            I04 => "i04_staff",
            I04_1 => "i04-1_staff",
            I05 | I05_1 => "i05_staff",
            I06 | I06_1 | I06_2 => "i06_staff",
            I07 => "i07_staff",
            I08 | I08_1 => "i08_staff",
            I09 | I09_1 | I09_2 => "i09_staff",
            I10 | I10_1 => "i10_staff",
            I11 | I11_1 => "i11_staff",
            I12 => "i12_staff",
            I13 | I13_1 => "i13_staff",
            I14 => "i14_staff",
            I15 | I15_1 => "i15_staff",
            I16 => "i16_staff",
            I18 => "i18_staff",
            I19 | I19_1 | I19_2 => "i19_staff",
            I20 | I20_1 => "i20_staff",
            I21 => "i21_staff",
            I22 => "i22_staff",
            I23 => "i23_staff",
            I24 => "i24_staff",
            K11 => "k11_staff",
            LABXCHEM => "labxchem_staff",
            M01 => "m01_staff",
            M02 => "m02_staff",
            M03 => "m03_staff",
            M04 => "m04_staff",
            M05 => "m05_staff",
            M06 => "m06_staff",
            M07 => "m07_staff",
            M08 => "m08_staff",
            M10 => "m10_staff",
            M11 => "m11_staff",
            M12 => "m12_staff",
            M13 => "m13_staff",
            M14 => "m14_staff",
            P02 => "p02_staff",
            P29 => "p29_staff",
            P32 => "p32_staff",
            P33 => "p33_staff",
            P38 => "p38_staff",
            P45 => "p45_staff",
            P51 => "p51_staff",
            P99 => "p99_staff",
            S01 => "s01_staff",
            S02 => "s02_staff",
            S03 => "s03_staff",
            S04 => "s04_staff",
            T01 => "t01_staff",
        };
        let mut groups = vec!["dls_dasc", staff];
        if self == I15_1 {
            groups.push("i15-1detector");
        }
        groups
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_instrument_mappings() {
        assert_eq!("i15-1".parse::<Instrument>().unwrap(), Instrument::I15_1);
        assert_eq!(
            Instrument::I15_1.directory(2026, "mx1234-1").as_deref(),
            Some("/dls/i15-1/data/2026/mx1234-1")
        );
        assert_eq!(
            Instrument::I15_1.ldap_groups(),
            ["dls_dasc", "i15_staff", "i15-1detector"]
        );
        assert_eq!(Instrument::I04_1.ldap_groups(), ["dls_dasc", "i04-1_staff"]);
        assert_eq!(Instrument::I06_2.ldap_groups(), ["dls_dasc", "i06_staff"]);
        assert_eq!(Instrument::T01.directory(2026, "ks10000-1"), None);
    }
}
