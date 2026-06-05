using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBrandWorkspaceNameUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Case-insensitive unique constraint on (workspace_id, name).
            // Functional index — EF Core fluent API does not natively express
            // this, so we drop down to raw SQL. CreateBrandCommandHandler
            // upserts by lower-cased name so it never trips this constraint
            // at runtime; the index is defense-in-depth against direct SQL
            // / future endpoints / racing inserts.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_brands_workspace_lower_name " +
                "ON brands (workspace_id, LOWER(name));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_brands_workspace_lower_name;");
        }
    }
}
