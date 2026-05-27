using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAnalysisJob : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "analysis_jobs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    scan_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    extract_started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    extract_completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    aggregate_started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    aggregate_completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    error_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_analysis_jobs", x => x.id);
                    table.ForeignKey(
                        name: "FK_analysis_jobs_scan_runs_scan_run_id",
                        column: x => x.scan_run_id,
                        principalTable: "scan_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_analysis_jobs_scan_run_id",
                table: "analysis_jobs",
                column: "scan_run_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_analysis_jobs_status",
                table: "analysis_jobs",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "analysis_jobs");
        }
    }
}
