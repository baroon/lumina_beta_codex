using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TrimTopicColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "aliases",
                table: "topics");

            migrationBuilder.DropColumn(
                name: "description",
                table: "topics");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "aliases",
                table: "topics",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "topics",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }
    }
}
