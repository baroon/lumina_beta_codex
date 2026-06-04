using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAnswerRecommendations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "answer_recommendations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_answer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    claimed_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_answer_recommendations", x => x.id);
                    table.ForeignKey(
                        name: "FK_answer_recommendations_ai_answers_ai_answer_id",
                        column: x => x.ai_answer_id,
                        principalTable: "ai_answers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_answer_recommendations_ai_answer_id",
                table: "answer_recommendations",
                column: "ai_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_answer_recommendations_normalized_name",
                table: "answer_recommendations",
                column: "normalized_name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "answer_recommendations");
        }
    }
}
