using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSlice2Entities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "answer_signals",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_answer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_mentioned = table.Column<bool>(type: "boolean", nullable: false),
                    brand_recommended = table.Column<bool>(type: "boolean", nullable: false),
                    brand_rank = table.Column<int>(type: "integer", nullable: true),
                    brand_sentiment = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    brand_recommendation_strength = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    top_recommended_entity = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    answer_has_ranking = table.Column<bool>(type: "boolean", nullable: false),
                    answer_has_comparison = table.Column<bool>(type: "boolean", nullable: false),
                    answer_has_citations = table.Column<bool>(type: "boolean", nullable: false),
                    owned_source_count = table.Column<int>(type: "integer", nullable: false),
                    competitor_source_count = table.Column<int>(type: "integer", nullable: false),
                    third_party_source_count = table.Column<int>(type: "integer", nullable: false),
                    confidence_score = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_answer_signals", x => x.id);
                    table.ForeignKey(
                        name: "FK_answer_signals_ai_answers_ai_answer_id",
                        column: x => x.ai_answer_id,
                        principalTable: "ai_answers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "citations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_answer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    normalized_source_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    normalized_domain = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    classification = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    citation_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    confidence_score = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_citations", x => x.id);
                    table.ForeignKey(
                        name: "FK_citations_ai_answers_ai_answer_id",
                        column: x => x.ai_answer_id,
                        principalTable: "ai_answers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "mention_candidates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_answer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    claimed_entity_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    claimed_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    evidence_snippet = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    confidence_score = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mention_candidates", x => x.id);
                    table.ForeignKey(
                        name: "FK_mention_candidates_ai_answers_ai_answer_id",
                        column: x => x.ai_answer_id,
                        principalTable: "ai_answers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "mentions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_answer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    is_recommended = table.Column<bool>(type: "boolean", nullable: false),
                    recommendation_strength = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    sentiment = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    confidence_score = table.Column<double>(type: "double precision", nullable: false),
                    evidence_snippet = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mentions", x => x.id);
                    table.CheckConstraint("chk_entity_id_not_null", "entity_id IS NOT NULL");
                    table.ForeignKey(
                        name: "FK_mentions_ai_answers_ai_answer_id",
                        column: x => x.ai_answer_id,
                        principalTable: "ai_answers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_answer_signals_ai_answer_id",
                table: "answer_signals",
                column: "ai_answer_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_citations_ai_answer_id",
                table: "citations",
                column: "ai_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_citations_classification",
                table: "citations",
                column: "classification");

            migrationBuilder.CreateIndex(
                name: "IX_citations_normalized_source_name",
                table: "citations",
                column: "normalized_source_name");

            migrationBuilder.CreateIndex(
                name: "IX_mention_candidates_ai_answer_id",
                table: "mention_candidates",
                column: "ai_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_candidates_claimed_entity_type_normalized_name",
                table: "mention_candidates",
                columns: new[] { "claimed_entity_type", "normalized_name" });

            migrationBuilder.CreateIndex(
                name: "IX_mentions_ai_answer_id",
                table: "mentions",
                column: "ai_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_mentions_entity_type_entity_id",
                table: "mentions",
                columns: new[] { "entity_type", "entity_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "answer_signals");

            migrationBuilder.DropTable(
                name: "citations");

            migrationBuilder.DropTable(
                name: "mention_candidates");

            migrationBuilder.DropTable(
                name: "mentions");
        }
    }
}
