use strum::{Display, EnumIter, EnumString};

/// Known Instruments at Diamond
#[derive(Debug, Clone, Copy, Display, EnumString, EnumIter, PartialEq, Eq, PartialOrd, Ord)]
#[allow(missing_docs)]
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
}
