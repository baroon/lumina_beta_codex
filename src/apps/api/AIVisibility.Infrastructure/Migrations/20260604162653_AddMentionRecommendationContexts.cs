using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMentionRecommendationContexts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mention_recommendation_contexts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_id = table.Column<Guid>(type: "uuid", nullable: false),
                    context_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    context_value = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mention_recommendation_contexts", x => x.id);
                    table.ForeignKey(
                        name: "FK_mention_recommendation_contexts_mentions_mention_id",
                        column: x => x.mention_id,
                        principalTable: "mentions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_mention_recommendation_contexts_context_type_context_value",
                table: "mention_recommendation_contexts",
                columns: new[] { "context_type", "context_value" });

            migrationBuilder.CreateIndex(
                name: "IX_mention_recommendation_contexts_mention_id",
                table: "mention_recommendation_contexts",
                column: "mention_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mention_recommendation_contexts");
        }
    }
}
