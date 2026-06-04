using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFactualClaims : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "factual_claims",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_id = table.Column<Guid>(type: "uuid", nullable: false),
                    claim_text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    subject = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    asserted_value = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    evidence_snippet = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    verifiability = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    review_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    confidence_score = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_factual_claims", x => x.id);
                    table.ForeignKey(
                        name: "FK_factual_claims_mentions_mention_id",
                        column: x => x.mention_id,
                        principalTable: "mentions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_factual_claims_mention_id",
                table: "factual_claims",
                column: "mention_id");

            migrationBuilder.CreateIndex(
                name: "IX_factual_claims_review_status",
                table: "factual_claims",
                column: "review_status");

            migrationBuilder.CreateIndex(
                name: "IX_factual_claims_subject",
                table: "factual_claims",
                column: "subject");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "factual_claims");
        }
    }
}
