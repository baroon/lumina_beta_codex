using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMentionPairs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mention_pairs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_answer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_a_id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_b_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mention_pairs", x => x.id);
                    table.ForeignKey(
                        name: "FK_mention_pairs_ai_answers_ai_answer_id",
                        column: x => x.ai_answer_id,
                        principalTable: "ai_answers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_mention_pairs_mentions_mention_a_id",
                        column: x => x.mention_a_id,
                        principalTable: "mentions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_mention_pairs_mentions_mention_b_id",
                        column: x => x.mention_b_id,
                        principalTable: "mentions",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_mention_pairs_ai_answer_id",
                table: "mention_pairs",
                column: "ai_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_pairs_ai_answer_id_mention_a_id_mention_b_id",
                table: "mention_pairs",
                columns: new[] { "ai_answer_id", "mention_a_id", "mention_b_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_mention_pairs_mention_a_id",
                table: "mention_pairs",
                column: "mention_a_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_pairs_mention_b_id",
                table: "mention_pairs",
                column: "mention_b_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mention_pairs");
        }
    }
}
