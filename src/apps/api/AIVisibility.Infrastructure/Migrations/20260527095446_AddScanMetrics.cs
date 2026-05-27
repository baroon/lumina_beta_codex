using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddScanMetrics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "scan_metrics",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    scan_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scope = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    scope_id = table.Column<Guid>(type: "uuid", nullable: true),
                    metric_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    metric_value = table.Column<double>(type: "double precision", nullable: false),
                    metadata_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scan_metrics", x => x.id);
                    table.CheckConstraint("chk_scan_metrics_scope_id_nullability", "(scope = 'Overall') = (scope_id IS NULL)");
                    table.ForeignKey(
                        name: "FK_scan_metrics_scan_runs_scan_run_id",
                        column: x => x.scan_run_id,
                        principalTable: "scan_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_scan_metrics_lookup",
                table: "scan_metrics",
                columns: new[] { "scan_run_id", "scope", "metric_name" });

            migrationBuilder.CreateIndex(
                name: "IX_scan_metrics_scan_run_id",
                table: "scan_metrics",
                column: "scan_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_scan_metrics_scope_scope_id",
                table: "scan_metrics",
                columns: new[] { "scope", "scope_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "scan_metrics");
        }
    }
}
