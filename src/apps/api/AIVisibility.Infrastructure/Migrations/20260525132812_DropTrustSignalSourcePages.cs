using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DropTrustSignalSourcePages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "source_pages",
                table: "trust_signals");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "source_pages",
                table: "trust_signals",
                type: "jsonb",
                nullable: true);
        }
    }
}
