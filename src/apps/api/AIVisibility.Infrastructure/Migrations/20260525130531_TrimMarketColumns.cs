using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TrimMarketColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "city",
                table: "markets");

            migrationBuilder.DropColumn(
                name: "currency_code",
                table: "markets");

            migrationBuilder.DropColumn(
                name: "is_custom",
                table: "markets");

            migrationBuilder.DropColumn(
                name: "language_code",
                table: "markets");

            migrationBuilder.DropColumn(
                name: "region",
                table: "markets");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "city",
                table: "markets",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "currency_code",
                table: "markets",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_custom",
                table: "markets",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "language_code",
                table: "markets",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "region",
                table: "markets",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }
    }
}
