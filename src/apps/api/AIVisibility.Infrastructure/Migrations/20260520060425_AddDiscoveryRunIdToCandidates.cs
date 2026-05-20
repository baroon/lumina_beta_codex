using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscoveryRunIdToCandidates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Delete all existing candidate rows — dev phase, no continuity needed.
            // Must run before adding the NOT NULL FK column.
            migrationBuilder.Sql("DELETE FROM trust_signals;");
            migrationBuilder.Sql("DELETE FROM topics;");
            migrationBuilder.Sql("DELETE FROM products;");
            migrationBuilder.Sql("DELETE FROM markets;");
            migrationBuilder.Sql("DELETE FROM competitors;");
            migrationBuilder.Sql("DELETE FROM audiences;");
            migrationBuilder.Sql("DELETE FROM brand_profiles;");

            migrationBuilder.AddColumn<Guid>(
                name: "discovery_run_id",
                table: "trust_signals",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "discovery_run_id",
                table: "topics",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "discovery_run_id",
                table: "products",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "discovery_run_id",
                table: "markets",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "discovery_run_id",
                table: "competitors",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "discovery_run_id",
                table: "audiences",
                type: "uuid",
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "IX_trust_signals_discovery_run_id",
                table: "trust_signals",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_topics_discovery_run_id",
                table: "topics",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_products_discovery_run_id",
                table: "products",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_markets_discovery_run_id",
                table: "markets",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_competitors_discovery_run_id",
                table: "competitors",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_audiences_discovery_run_id",
                table: "audiences",
                column: "discovery_run_id");

            migrationBuilder.AddForeignKey(
                name: "FK_audiences_discovery_runs_discovery_run_id",
                table: "audiences",
                column: "discovery_run_id",
                principalTable: "discovery_runs",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_competitors_discovery_runs_discovery_run_id",
                table: "competitors",
                column: "discovery_run_id",
                principalTable: "discovery_runs",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_markets_discovery_runs_discovery_run_id",
                table: "markets",
                column: "discovery_run_id",
                principalTable: "discovery_runs",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_products_discovery_runs_discovery_run_id",
                table: "products",
                column: "discovery_run_id",
                principalTable: "discovery_runs",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_topics_discovery_runs_discovery_run_id",
                table: "topics",
                column: "discovery_run_id",
                principalTable: "discovery_runs",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_trust_signals_discovery_runs_discovery_run_id",
                table: "trust_signals",
                column: "discovery_run_id",
                principalTable: "discovery_runs",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_audiences_discovery_runs_discovery_run_id",
                table: "audiences");

            migrationBuilder.DropForeignKey(
                name: "FK_competitors_discovery_runs_discovery_run_id",
                table: "competitors");

            migrationBuilder.DropForeignKey(
                name: "FK_markets_discovery_runs_discovery_run_id",
                table: "markets");

            migrationBuilder.DropForeignKey(
                name: "FK_products_discovery_runs_discovery_run_id",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_topics_discovery_runs_discovery_run_id",
                table: "topics");

            migrationBuilder.DropForeignKey(
                name: "FK_trust_signals_discovery_runs_discovery_run_id",
                table: "trust_signals");

            migrationBuilder.DropIndex(
                name: "IX_trust_signals_discovery_run_id",
                table: "trust_signals");

            migrationBuilder.DropIndex(
                name: "IX_topics_discovery_run_id",
                table: "topics");

            migrationBuilder.DropIndex(
                name: "IX_products_discovery_run_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_markets_discovery_run_id",
                table: "markets");

            migrationBuilder.DropIndex(
                name: "IX_competitors_discovery_run_id",
                table: "competitors");

            migrationBuilder.DropIndex(
                name: "IX_audiences_discovery_run_id",
                table: "audiences");

            migrationBuilder.DropColumn(
                name: "discovery_run_id",
                table: "trust_signals");

            migrationBuilder.DropColumn(
                name: "discovery_run_id",
                table: "topics");

            migrationBuilder.DropColumn(
                name: "discovery_run_id",
                table: "products");

            migrationBuilder.DropColumn(
                name: "discovery_run_id",
                table: "markets");

            migrationBuilder.DropColumn(
                name: "discovery_run_id",
                table: "competitors");

            migrationBuilder.DropColumn(
                name: "discovery_run_id",
                table: "audiences");
        }
    }
}
