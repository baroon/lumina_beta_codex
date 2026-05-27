using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNormalizedSourceModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Phase 4 Slice 0 hard gate (plan §6.1): the citation refactor wipes
            // every analysis output. Existing citation rows can't satisfy the
            // new NOT NULL source_id FK, and the old 4-bucket classification
            // doesn't map cleanly to the 12-value SourceType taxonomy. Wipe
            // analysis outputs so the next scan rebuilds them under the new
            // model. Local-dev-only — production has no prior data because
            // Phase 3 hasn't shipped to prod.
            migrationBuilder.Sql(@"
                TRUNCATE TABLE
                    citations,
                    scan_metrics,
                    analysis_jobs,
                    answer_signals,
                    mentions,
                    mention_candidates
                RESTART IDENTITY CASCADE;
            ");

            migrationBuilder.DropIndex(
                name: "IX_citations_classification",
                table: "citations");

            migrationBuilder.DropIndex(
                name: "IX_citations_normalized_source_name",
                table: "citations");

            migrationBuilder.DropColumn(
                name: "classification",
                table: "citations");

            migrationBuilder.DropColumn(
                name: "normalized_domain",
                table: "citations");

            migrationBuilder.DropColumn(
                name: "normalized_source_name",
                table: "citations");

            migrationBuilder.DropColumn(
                name: "source_name",
                table: "citations");

            migrationBuilder.DropColumn(
                name: "url",
                table: "citations");

            migrationBuilder.AddColumn<int>(
                name: "citation_position",
                table: "citations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "citation_text",
                table: "citations",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "source_id",
                table: "citations",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "source_url_id",
                table: "citations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "source_types",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_source_types", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sources",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    domain = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    normalized_domain = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sources", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "source_urls",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    normalized_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_source_urls", x => x.id);
                    table.ForeignKey(
                        name: "FK_source_urls_sources_source_id",
                        column: x => x.source_id,
                        principalTable: "sources",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "brand_source_classifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_url_id = table.Column<Guid>(type: "uuid", nullable: true),
                    source_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    confidence_score = table.Column<double>(type: "double precision", nullable: false),
                    provenance_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_brand_source_classifications", x => x.id);
                    table.ForeignKey(
                        name: "FK_brand_source_classifications_brands_brand_id",
                        column: x => x.brand_id,
                        principalTable: "brands",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_brand_source_classifications_source_urls_source_url_id",
                        column: x => x.source_url_id,
                        principalTable: "source_urls",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_brand_source_classifications_sources_source_id",
                        column: x => x.source_id,
                        principalTable: "sources",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_citations_source_id",
                table: "citations",
                column: "source_id");

            migrationBuilder.CreateIndex(
                name: "IX_citations_source_url_id",
                table: "citations",
                column: "source_url_id");

            migrationBuilder.CreateIndex(
                name: "IX_brand_source_classifications_brand_id",
                table: "brand_source_classifications",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_brand_source_classifications_brand_id_source_id",
                table: "brand_source_classifications",
                columns: new[] { "brand_id", "source_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_brand_source_classifications_source_id",
                table: "brand_source_classifications",
                column: "source_id");

            migrationBuilder.CreateIndex(
                name: "IX_brand_source_classifications_source_type",
                table: "brand_source_classifications",
                column: "source_type");

            migrationBuilder.CreateIndex(
                name: "IX_brand_source_classifications_source_url_id",
                table: "brand_source_classifications",
                column: "source_url_id");

            migrationBuilder.CreateIndex(
                name: "IX_source_types_code",
                table: "source_types",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_source_urls_normalized_url",
                table: "source_urls",
                column: "normalized_url",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_source_urls_source_id",
                table: "source_urls",
                column: "source_id");

            migrationBuilder.CreateIndex(
                name: "IX_sources_normalized_domain",
                table: "sources",
                column: "normalized_domain");

            migrationBuilder.CreateIndex(
                name: "IX_sources_source_name",
                table: "sources",
                column: "source_name");

            migrationBuilder.AddForeignKey(
                name: "FK_citations_source_urls_source_url_id",
                table: "citations",
                column: "source_url_id",
                principalTable: "source_urls",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_citations_sources_source_id",
                table: "citations",
                column: "source_id",
                principalTable: "sources",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            // Seed the 12-value SourceType taxonomy reference rows
            // (ADR-003 §Source Type Taxonomy). Soft reference — no FK from
            // brand_source_classifications.source_type to this table; the
            // link is by code (the enum's ToString form). Codes here must
            // match Domain.Enums.SourceType exactly.
            migrationBuilder.Sql(@"
                INSERT INTO source_types (id, code, name, description, display_order) VALUES
                  (gen_random_uuid(), 'Owned',         'Owned',         'The brand''s own properties — its website, blog, social pages, owned domains.', 1),
                  (gen_random_uuid(), 'Competitor',    'Competitor',    'A tracked competitor''s own properties.', 2),
                  (gen_random_uuid(), 'Corporate',     'Corporate',     'A non-competitor corporate site (e.g. partner, supplier, parent company).', 3),
                  (gen_random_uuid(), 'UGC',           'User-Generated','User-generated content — forum posts, Reddit threads, community discussions.', 4),
                  (gen_random_uuid(), 'Editorial',     'Editorial',     'News articles, magazine pieces, journalistic coverage.', 5),
                  (gen_random_uuid(), 'ReviewSite',    'Review Site',   'Dedicated review aggregators — G2, Trustpilot, Capterra, Yelp.', 6),
                  (gen_random_uuid(), 'Social',        'Social',        'Social-media platforms — Twitter/X, LinkedIn, Instagram, TikTok posts.', 7),
                  (gen_random_uuid(), 'Institutional', 'Institutional', 'Government, NGO, academic, or industry-body publications.', 8),
                  (gen_random_uuid(), 'Reference',     'Reference',     'Reference works — Wikipedia, encyclopedias, dictionaries, knowledge bases.', 9),
                  (gen_random_uuid(), 'Marketplace',   'Marketplace',   'E-commerce listings — Amazon, eBay, App Store product pages.', 10),
                  (gen_random_uuid(), 'Other',         'Other',         'Real source that doesn''t fit the above categories.', 11),
                  (gen_random_uuid(), 'Unknown',       'Unknown',       'Source not yet classified — v1 URL-domain matcher could not assign a type.', 12);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_citations_source_urls_source_url_id",
                table: "citations");

            migrationBuilder.DropForeignKey(
                name: "FK_citations_sources_source_id",
                table: "citations");

            migrationBuilder.DropTable(
                name: "brand_source_classifications");

            migrationBuilder.DropTable(
                name: "source_types");

            migrationBuilder.DropTable(
                name: "source_urls");

            migrationBuilder.DropTable(
                name: "sources");

            migrationBuilder.DropIndex(
                name: "IX_citations_source_id",
                table: "citations");

            migrationBuilder.DropIndex(
                name: "IX_citations_source_url_id",
                table: "citations");

            migrationBuilder.DropColumn(
                name: "citation_position",
                table: "citations");

            migrationBuilder.DropColumn(
                name: "citation_text",
                table: "citations");

            migrationBuilder.DropColumn(
                name: "source_id",
                table: "citations");

            migrationBuilder.DropColumn(
                name: "source_url_id",
                table: "citations");

            migrationBuilder.AddColumn<string>(
                name: "classification",
                table: "citations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "normalized_domain",
                table: "citations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "normalized_source_name",
                table: "citations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "source_name",
                table: "citations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "url",
                table: "citations",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_citations_classification",
                table: "citations",
                column: "classification");

            migrationBuilder.CreateIndex(
                name: "IX_citations_normalized_source_name",
                table: "citations",
                column: "normalized_source_name");
        }
    }
}
