using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMentionComparisons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mention_comparisons",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_id = table.Column<Guid>(type: "uuid", nullable: false),
                    vs_entity_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    vs_entity_normalized = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    on_aspect = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    winner_is_this_mention = table.Column<bool>(type: "boolean", nullable: false),
                    evidence_snippet = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mention_comparisons", x => x.id);
                    table.ForeignKey(
                        name: "FK_mention_comparisons_mentions_mention_id",
                        column: x => x.mention_id,
                        principalTable: "mentions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_mention_comparisons_mention_id",
                table: "mention_comparisons",
                column: "mention_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_comparisons_on_aspect",
                table: "mention_comparisons",
                column: "on_aspect");

            migrationBuilder.CreateIndex(
                name: "IX_mention_comparisons_vs_entity_normalized",
                table: "mention_comparisons",
                column: "vs_entity_normalized");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mention_comparisons");
        }
    }
}
