using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTrendPoints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "trend_points",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scan_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    metric_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    numeric_value = table.Column<double>(type: "double precision", nullable: true),
                    categorical_value = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    captured_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trend_points", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_trend_points_tracker_configuration_id_captured_at",
                table: "trend_points",
                columns: new[] { "tracker_configuration_id", "captured_at" });

            migrationBuilder.CreateIndex(
                name: "IX_trend_points_tracker_configuration_id_scan_run_id_metric_na~",
                table: "trend_points",
                columns: new[] { "tracker_configuration_id", "scan_run_id", "metric_name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "trend_points");
        }
    }
}
