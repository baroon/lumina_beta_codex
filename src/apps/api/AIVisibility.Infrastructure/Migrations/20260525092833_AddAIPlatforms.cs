using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAIPlatforms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ai_platforms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_platforms", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tracker_platforms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_platform_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_platforms", x => x.id);
                    table.ForeignKey(
                        name: "FK_tracker_platforms_tracker_configurations_tracker_configurat~",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "ai_platforms",
                columns: new[] { "id", "code", "display_order", "name" },
                values: new object[,]
                {
                    { new Guid("a0000000-0000-0000-0000-000000000001"), "ChatGpt", 1, "ChatGPT" },
                    { new Guid("a0000000-0000-0000-0000-000000000002"), "ChatGptSearch", 2, "ChatGPT Search" },
                    { new Guid("a0000000-0000-0000-0000-000000000003"), "Gemini", 3, "Gemini" },
                    { new Guid("a0000000-0000-0000-0000-000000000004"), "Claude", 4, "Claude" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_platforms_code",
                table: "ai_platforms",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tracker_platforms_tracker_configuration_id",
                table: "tracker_platforms",
                column: "tracker_configuration_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_platforms");

            migrationBuilder.DropTable(
                name: "tracker_platforms");
        }
    }
}
