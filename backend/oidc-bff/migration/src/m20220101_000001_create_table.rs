use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(OidcTokens::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OidcTokens::Issuer)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OidcTokens::Subject)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OidcTokens::EncryptedRefreshToken)
                            .binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OidcTokens::ExpiresAt)
                            .timestamp_with_time_zone(),
                    )
                    .col(
                        ColumnDef::new(OidcTokens::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(OidcTokens::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .primary_key(
                        Index::create()
                            .col(OidcTokens::Subject)
                            .primary(),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(OidcTokens::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum OidcTokens {
    Table,
    Issuer,
    Subject,
    EncryptedRefreshToken,
    ExpiresAt,
    CreatedAt,
    UpdatedAt,
}