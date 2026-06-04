using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMentionRiskFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mention_risk_flags",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_id = table.Column<Guid>(type: "uuid", nullable: false),
                    flag_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    evidence_snippet = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mention_risk_flags", x => x.id);
                    table.ForeignKey(
                        name: "FK_mention_risk_flags_mentions_mention_id",
                        column: x => x.mention_id,
                        principalTable: "mentions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_mention_risk_flags_flag_type",
                table: "mention_risk_flags",
                column: "flag_type");

            migrationBuilder.CreateIndex(
                name: "IX_mention_risk_flags_mention_id",
                table: "mention_risk_flags",
                column: "mention_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mention_risk_flags");
        }
    }
}
