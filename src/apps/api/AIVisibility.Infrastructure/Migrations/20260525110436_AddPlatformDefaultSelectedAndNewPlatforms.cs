using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPlatformDefaultSelectedAndNewPlatforms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_default_selected",
                table: "ai_platforms",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "ai_platforms",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                column: "is_default_selected",
                value: true);

            migrationBuilder.UpdateData(
                table: "ai_platforms",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                column: "is_default_selected",
                value: false);

            migrationBuilder.UpdateData(
                table: "ai_platforms",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                column: "is_default_selected",
                value: true);

            migrationBuilder.UpdateData(
                table: "ai_platforms",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                column: "is_default_selected",
                value: true);

            migrationBuilder.InsertData(
                table: "ai_platforms",
                columns: new[] { "id", "code", "display_order", "is_default_selected", "name" },
                values: new object[,]
                {
                    { new Guid("a0000000-0000-0000-0000-000000000005"), "Grok", 5, false, "Grok" },
                    { new Guid("a0000000-0000-0000-0000-000000000006"), "Perplexity", 6, false, "Perplexity" },
                    { new Guid("a0000000-0000-0000-0000-000000000007"), "Copilot", 7, false, "Copilot" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ai_platforms",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000005"));

            migrationBuilder.DeleteData(
                table: "ai_platforms",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000006"));

            migrationBuilder.DeleteData(
                table: "ai_platforms",
                keyColumn: "id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000007"));

            migrationBuilder.DropColumn(
                name: "is_default_selected",
                table: "ai_platforms");
        }
    }
}
