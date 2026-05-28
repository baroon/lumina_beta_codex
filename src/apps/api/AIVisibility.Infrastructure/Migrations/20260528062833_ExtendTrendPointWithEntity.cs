using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ExtendTrendPointWithEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Phase 4 v2 D2: wipe existing trend_points + the 6 synthetic
            // scans that backfilled the v1 dashboard. Existing trend rows
            // are our-brand-only and incompatible with the new per-entity
            // schema; the synthetic scans were our-brand-only fixtures with
            // no real prompt_run/answer data. The synthetic-seed script is
            // rewritten in a subsequent commit to emit per-entity rows for
            // the next dashboard run.
            //
            // Local-dev only — same pre-authorized scope as Phase 4 Slice 0.
            // Real scans (Slice 0/1 verify-e2e) keep their scan_metrics; the
            // trend chart will show just current-scan points for them until
            // the next scan runs the new aggregator path.
            migrationBuilder.Sql(@"
                TRUNCATE TABLE trend_points;

                DELETE FROM scan_metrics WHERE scan_run_id IN (
                    '33b28ae4-a9fc-1d8c-8e01-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e02-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e03-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e04-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e05-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e06-71356ca9ef30'
                );
                DELETE FROM analysis_jobs WHERE scan_run_id IN (
                    '33b28ae4-a9fc-1d8c-8e01-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e02-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e03-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e04-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e05-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e06-71356ca9ef30'
                );
                DELETE FROM scan_runs WHERE id IN (
                    '33b28ae4-a9fc-1d8c-8e01-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e02-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e03-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e04-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e05-71356ca9ef30',
                    '33b28ae4-a9fc-1d8c-8e06-71356ca9ef30'
                );
            ");

            migrationBuilder.DropIndex(
                name: "IX_trend_points_tracker_configuration_id_scan_run_id_metric_na~",
                table: "trend_points");

            // Defaults required at AddColumn time because Postgres won't add a
            // NOT NULL column to a non-empty table without one. The trend_points
            // wipe above guarantees the table is empty when this runs, so the
            // defaults are immediately stripped to keep the schema clean — no
            // compat-shim DEFAULT survives (per memory data-integrity-no-compat-shims).
            migrationBuilder.AddColumn<Guid>(
                name: "entity_id",
                table: "trend_points",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "entity_type",
                table: "trend_points",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(@"
                ALTER TABLE trend_points ALTER COLUMN entity_id DROP DEFAULT;
                ALTER TABLE trend_points ALTER COLUMN entity_type DROP DEFAULT;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_trend_points_tracker_configuration_id_scan_run_id_entity_ty~",
                table: "trend_points",
                columns: new[] { "tracker_configuration_id", "scan_run_id", "entity_type", "entity_id", "metric_name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_trend_points_tracker_configuration_id_scan_run_id_entity_ty~",
                table: "trend_points");

            migrationBuilder.DropColumn(
                name: "entity_id",
                table: "trend_points");

            migrationBuilder.DropColumn(
                name: "entity_type",
                table: "trend_points");

            migrationBuilder.CreateIndex(
                name: "IX_trend_points_tracker_configuration_id_scan_run_id_metric_na~",
                table: "trend_points",
                columns: new[] { "tracker_configuration_id", "scan_run_id", "metric_name" },
                unique: true);
        }
    }
}
