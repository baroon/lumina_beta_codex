using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMentionTopicRecommendations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mention_topic_recommendations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_id = table.Column<Guid>(type: "uuid", nullable: false),
                    topic_name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    topic_normalized = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    is_recommended = table.Column<bool>(type: "boolean", nullable: false),
                    strength = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mention_topic_recommendations", x => x.id);
                    table.ForeignKey(
                        name: "FK_mention_topic_recommendations_mentions_mention_id",
                        column: x => x.mention_id,
                        principalTable: "mentions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_mention_topic_recommendations_mention_id",
                table: "mention_topic_recommendations",
                column: "mention_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_topic_recommendations_topic_normalized",
                table: "mention_topic_recommendations",
                column: "topic_normalized");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mention_topic_recommendations");
        }
    }
}
