using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ai_platforms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    is_default_selected = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_platforms", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "brands",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    website_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    aliases = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_brands", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lenses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lenses", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "prompt_templates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lens_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    template_text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_templates", x => x.id);
                    table.ForeignKey(
                        name: "FK_prompt_templates_lenses_lens_id",
                        column: x => x.lens_id,
                        principalTable: "lenses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

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
                    normalized_domain = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    authority_score = table.Column<double>(type: "double precision", nullable: true),
                    published_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sources", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "discovery_runs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    extracted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    pages_crawled = table.Column<int>(type: "integer", nullable: false),
                    error = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_discovery_runs", x => x.id);
                    table.ForeignKey(
                        name: "FK_discovery_runs_brands_brand_id",
                        column: x => x.brand_id,
                        principalTable: "brands",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tracker_configurations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    is_name_user_edited = table.Column<bool>(type: "boolean", nullable: false),
                    prompt_allocation = table.Column<int>(type: "integer", nullable: false),
                    cadence = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    timezone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    next_run_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_run_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_configurations", x => x.id);
                    table.ForeignKey(
                        name: "FK_tracker_configurations_brands_brand_id",
                        column: x => x.brand_id,
                        principalTable: "brands",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
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
                name: "audiences",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audiences", x => x.id);
                    table.ForeignKey(
                        name: "FK_audiences_brands_brand_id",
                        column: x => x.brand_id,
                        principalTable: "brands",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_audiences_discovery_runs_discovery_run_id",
                        column: x => x.discovery_run_id,
                        principalTable: "discovery_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "brand_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    short_description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    industry = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    category = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    positioning = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_brand_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_brand_profiles_brands_brand_id",
                        column: x => x.brand_id,
                        principalTable: "brands",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_brand_profiles_discovery_runs_discovery_run_id",
                        column: x => x.discovery_run_id,
                        principalTable: "discovery_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "competitors",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    aliases = table.Column<string>(type: "jsonb", nullable: false),
                    domain = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_competitors", x => x.id);
                    table.ForeignKey(
                        name: "FK_competitors_brands_brand_id",
                        column: x => x.brand_id,
                        principalTable: "brands",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_competitors_discovery_runs_discovery_run_id",
                        column: x => x.discovery_run_id,
                        principalTable: "discovery_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "crawled_pages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    meta_description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    headings = table.Column<string>(type: "jsonb", nullable: false),
                    extracted_text_blob_ref = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    crawled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crawled_pages", x => x.id);
                    table.ForeignKey(
                        name: "FK_crawled_pages_discovery_runs_discovery_run_id",
                        column: x => x.discovery_run_id,
                        principalTable: "discovery_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "markets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    country_code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_markets", x => x.id);
                    table.ForeignKey(
                        name: "FK_markets_brands_brand_id",
                        column: x => x.brand_id,
                        principalTable: "brands",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_markets_discovery_runs_discovery_run_id",
                        column: x => x.discovery_run_id,
                        principalTable: "discovery_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    aliases = table.Column<string>(type: "jsonb", nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    product_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_products", x => x.id);
                    table.ForeignKey(
                        name: "FK_products_brands_brand_id",
                        column: x => x.brand_id,
                        principalTable: "brands",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_products_discovery_runs_discovery_run_id",
                        column: x => x.discovery_run_id,
                        principalTable: "discovery_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "topics",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_topics", x => x.id);
                    table.ForeignKey(
                        name: "FK_topics_brands_brand_id",
                        column: x => x.brand_id,
                        principalTable: "brands",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_topics_discovery_runs_discovery_run_id",
                        column: x => x.discovery_run_id,
                        principalTable: "discovery_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "trust_signals",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    signal_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trust_signals", x => x.id);
                    table.ForeignKey(
                        name: "FK_trust_signals_brands_brand_id",
                        column: x => x.brand_id,
                        principalTable: "brands",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_trust_signals_discovery_runs_discovery_run_id",
                        column: x => x.discovery_run_id,
                        principalTable: "discovery_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prompts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    prompt_text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    lens_id = table.Column<Guid>(type: "uuid", nullable: false),
                    prompt_template_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    archived_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompts", x => x.id);
                    table.ForeignKey(
                        name: "FK_prompts_lenses_lens_id",
                        column: x => x.lens_id,
                        principalTable: "lenses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_prompts_prompt_templates_prompt_template_id",
                        column: x => x.prompt_template_id,
                        principalTable: "prompt_templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_prompts_tracker_configurations_tracker_configuration_id",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "scan_runs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    trigger_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    prompt_count = table.Column<int>(type: "integer", nullable: false),
                    platform_count = table.Column<int>(type: "integer", nullable: false),
                    scan_check_count = table.Column<int>(type: "integer", nullable: false),
                    completed_count = table.Column<int>(type: "integer", nullable: false),
                    failed_count = table.Column<int>(type: "integer", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scan_runs", x => x.id);
                    table.ForeignKey(
                        name: "FK_scan_runs_tracker_configurations_tracker_configuration_id",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tracker_audiences",
                columns: table => new
                {
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    audience_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_audiences", x => new { x.tracker_configuration_id, x.audience_id });
                    table.ForeignKey(
                        name: "FK_tracker_audiences_audiences_audience_id",
                        column: x => x.audience_id,
                        principalTable: "audiences",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tracker_audiences_tracker_configurations_tracker_configurat~",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tracker_competitors",
                columns: table => new
                {
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    competitor_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_competitors", x => new { x.tracker_configuration_id, x.competitor_id });
                    table.ForeignKey(
                        name: "FK_tracker_competitors_competitors_competitor_id",
                        column: x => x.competitor_id,
                        principalTable: "competitors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tracker_competitors_tracker_configurations_tracker_configur~",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tracker_lenses",
                columns: table => new
                {
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lens_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_lenses", x => new { x.tracker_configuration_id, x.lens_id });
                    table.ForeignKey(
                        name: "FK_tracker_lenses_lenses_lens_id",
                        column: x => x.lens_id,
                        principalTable: "lenses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tracker_lenses_tracker_configurations_tracker_configuration~",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tracker_markets",
                columns: table => new
                {
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    market_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_markets", x => new { x.tracker_configuration_id, x.market_id });
                    table.ForeignKey(
                        name: "FK_tracker_markets_markets_market_id",
                        column: x => x.market_id,
                        principalTable: "markets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tracker_markets_tracker_configurations_tracker_configuratio~",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tracker_platforms",
                columns: table => new
                {
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_platform_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_platforms", x => new { x.tracker_configuration_id, x.ai_platform_id });
                    table.ForeignKey(
                        name: "FK_tracker_platforms_ai_platforms_ai_platform_id",
                        column: x => x.ai_platform_id,
                        principalTable: "ai_platforms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tracker_platforms_tracker_configurations_tracker_configurat~",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tracker_products",
                columns: table => new
                {
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_products", x => new { x.tracker_configuration_id, x.product_id });
                    table.ForeignKey(
                        name: "FK_tracker_products_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tracker_products_tracker_configurations_tracker_configurati~",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tracker_topics",
                columns: table => new
                {
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_topics", x => new { x.tracker_configuration_id, x.topic_id });
                    table.ForeignKey(
                        name: "FK_tracker_topics_topics_topic_id",
                        column: x => x.topic_id,
                        principalTable: "topics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tracker_topics_tracker_configurations_tracker_configuration~",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
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

            migrationBuilder.CreateTable(
                name: "prompt_audiences",
                columns: table => new
                {
                    prompt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    audience_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_audiences", x => new { x.prompt_id, x.audience_id });
                    table.ForeignKey(
                        name: "FK_prompt_audiences_audiences_audience_id",
                        column: x => x.audience_id,
                        principalTable: "audiences",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_prompt_audiences_prompts_prompt_id",
                        column: x => x.prompt_id,
                        principalTable: "prompts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prompt_competitors",
                columns: table => new
                {
                    prompt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    competitor_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_competitors", x => new { x.prompt_id, x.competitor_id });
                    table.ForeignKey(
                        name: "FK_prompt_competitors_competitors_competitor_id",
                        column: x => x.competitor_id,
                        principalTable: "competitors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_prompt_competitors_prompts_prompt_id",
                        column: x => x.prompt_id,
                        principalTable: "prompts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prompt_markets",
                columns: table => new
                {
                    prompt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    market_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_markets", x => new { x.prompt_id, x.market_id });
                    table.ForeignKey(
                        name: "FK_prompt_markets_markets_market_id",
                        column: x => x.market_id,
                        principalTable: "markets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_prompt_markets_prompts_prompt_id",
                        column: x => x.prompt_id,
                        principalTable: "prompts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prompt_products",
                columns: table => new
                {
                    prompt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_products", x => new { x.prompt_id, x.product_id });
                    table.ForeignKey(
                        name: "FK_prompt_products_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_prompt_products_prompts_prompt_id",
                        column: x => x.prompt_id,
                        principalTable: "prompts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prompt_topics",
                columns: table => new
                {
                    prompt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_topics", x => new { x.prompt_id, x.topic_id });
                    table.ForeignKey(
                        name: "FK_prompt_topics_prompts_prompt_id",
                        column: x => x.prompt_id,
                        principalTable: "prompts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_prompt_topics_topics_topic_id",
                        column: x => x.topic_id,
                        principalTable: "topics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

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
                    aggregate_retry_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
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

            migrationBuilder.CreateTable(
                name: "prompt_runs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    scan_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    prompt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_platform_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    error_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_runs", x => x.id);
                    table.ForeignKey(
                        name: "FK_prompt_runs_ai_platforms_ai_platform_id",
                        column: x => x.ai_platform_id,
                        principalTable: "ai_platforms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_prompt_runs_prompts_prompt_id",
                        column: x => x.prompt_id,
                        principalTable: "prompts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_prompt_runs_scan_runs_scan_run_id",
                        column: x => x.scan_run_id,
                        principalTable: "scan_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

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

            migrationBuilder.CreateTable(
                name: "trend_points",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scan_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    metric_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    numeric_value = table.Column<double>(type: "double precision", nullable: true),
                    categorical_value = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    captured_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trend_points", x => x.id);
                    table.ForeignKey(
                        name: "FK_trend_points_scan_runs_scan_run_id",
                        column: x => x.scan_run_id,
                        principalTable: "scan_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_trend_points_tracker_configurations_tracker_configuration_id",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_answers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prompt_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    answer_text = table.Column<string>(type: "text", nullable: false),
                    raw_response = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_answers", x => x.id);
                    table.ForeignKey(
                        name: "FK_ai_answers_prompt_runs_prompt_run_id",
                        column: x => x.prompt_run_id,
                        principalTable: "prompt_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "answer_recommendations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_answer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    claimed_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_answer_recommendations", x => x.id);
                    table.ForeignKey(
                        name: "FK_answer_recommendations_ai_answers_ai_answer_id",
                        column: x => x.ai_answer_id,
                        principalTable: "ai_answers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "answer_signals",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_answer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_mentioned = table.Column<bool>(type: "boolean", nullable: false),
                    brand_recommended = table.Column<bool>(type: "boolean", nullable: false),
                    brand_rank = table.Column<int>(type: "integer", nullable: true),
                    brand_rank_universe_size = table.Column<int>(type: "integer", nullable: true),
                    brand_sentiment = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    brand_sentiment_score = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    brand_recommendation_strength = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    brand_recommendation_score = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    answer_certainty = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.5),
                    answer_has_ranking = table.Column<bool>(type: "boolean", nullable: false),
                    answer_has_comparison = table.Column<bool>(type: "boolean", nullable: false),
                    answer_has_citations = table.Column<bool>(type: "boolean", nullable: false),
                    owned_source_count = table.Column<int>(type: "integer", nullable: false),
                    competitor_source_count = table.Column<int>(type: "integer", nullable: false),
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
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_url_id = table.Column<Guid>(type: "uuid", nullable: true),
                    citation_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    citation_position = table.Column<int>(type: "integer", nullable: true),
                    citation_text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    evidence_snippet = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
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
                    table.ForeignKey(
                        name: "FK_citations_source_urls_source_url_id",
                        column: x => x.source_url_id,
                        principalTable: "source_urls",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_citations_sources_source_id",
                        column: x => x.source_id,
                        principalTable: "sources",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
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
                    recommendation_score = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    sentiment = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    sentiment_score = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    confidence_score = table.Column<double>(type: "double precision", nullable: false),
                    evidence_snippet = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    mention_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    first_mention_position = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.5),
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

            migrationBuilder.CreateTable(
                name: "mention_attributes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    polarity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    evidence_snippet = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    confidence_score = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mention_attributes", x => x.id);
                    table.ForeignKey(
                        name: "FK_mention_attributes_mentions_mention_id",
                        column: x => x.mention_id,
                        principalTable: "mentions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "mention_comparisons",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_id = table.Column<Guid>(type: "uuid", nullable: false),
                    vs_entity_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    vs_entity_normalized = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    on_aspect = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    winner_is_this_mention = table.Column<bool>(type: "boolean", nullable: false),
                    evidence_snippet = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mention_comparisons", x => x.id);
                    table.ForeignKey(
                        name: "FK_mention_comparisons_mentions_mention_id",
                        column: x => x.mention_id,
                        principalTable: "mentions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "mention_pairs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_answer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_a_id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_b_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mention_pairs", x => x.id);
                    table.ForeignKey(
                        name: "FK_mention_pairs_ai_answers_ai_answer_id",
                        column: x => x.ai_answer_id,
                        principalTable: "ai_answers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_mention_pairs_mentions_mention_a_id",
                        column: x => x.mention_a_id,
                        principalTable: "mentions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_mention_pairs_mentions_mention_b_id",
                        column: x => x.mention_b_id,
                        principalTable: "mentions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "mention_recommendation_contexts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    mention_id = table.Column<Guid>(type: "uuid", nullable: false),
                    context_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    context_value = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mention_recommendation_contexts", x => x.id);
                    table.ForeignKey(
                        name: "FK_mention_recommendation_contexts_mentions_mention_id",
                        column: x => x.mention_id,
                        principalTable: "mentions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

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

            migrationBuilder.InsertData(
                table: "ai_platforms",
                columns: new[] { "id", "code", "display_order", "is_default_selected", "name" },
                values: new object[,]
                {
                    { new Guid("a0000000-0000-0000-0000-000000000001"), "ChatGpt", 1, true, "ChatGPT" },
                    { new Guid("a0000000-0000-0000-0000-000000000002"), "ChatGptSearch", 2, false, "ChatGPT Search" },
                    { new Guid("a0000000-0000-0000-0000-000000000003"), "Gemini", 3, false, "Gemini" },
                    { new Guid("a0000000-0000-0000-0000-000000000004"), "Claude", 4, false, "Claude" },
                    { new Guid("a0000000-0000-0000-0000-000000000005"), "Grok", 5, false, "Grok" },
                    { new Guid("a0000000-0000-0000-0000-000000000006"), "Perplexity", 6, false, "Perplexity" },
                    { new Guid("a0000000-0000-0000-0000-000000000007"), "Copilot", 7, false, "Copilot" }
                });

            migrationBuilder.InsertData(
                table: "source_types",
                columns: new[] { "id", "code", "description", "display_order", "name" },
                values: new object[,]
                {
                    { new Guid("d0000000-0000-0000-0000-000000000001"), "Owned", "The brand's own website, documentation, or properties.", 1, "Owned" },
                    { new Guid("d0000000-0000-0000-0000-000000000002"), "Competitor", "A tracked competitor's website or properties.", 2, "Competitor" },
                    { new Guid("d0000000-0000-0000-0000-000000000003"), "Corporate", "Other company or business websites that aren't the brand or a tracked competitor.", 3, "Corporate" },
                    { new Guid("d0000000-0000-0000-0000-000000000004"), "UGC", "Forums, Q&A sites, and community platforms such as Reddit, Quora, and Stack Exchange.", 4, "User-Generated Content" },
                    { new Guid("d0000000-0000-0000-0000-000000000005"), "Editorial", "News organizations, magazines, and journalism sites.", 5, "Editorial" },
                    { new Guid("d0000000-0000-0000-0000-000000000006"), "ReviewSite", "Dedicated review aggregators and rating platforms such as G2, Capterra, and Trustpilot.", 6, "Review Site" },
                    { new Guid("d0000000-0000-0000-0000-000000000007"), "Social", "Social media platforms such as LinkedIn, Twitter/X, and Facebook.", 7, "Social" },
                    { new Guid("d0000000-0000-0000-0000-000000000008"), "Institutional", "Universities, government, and non-profit organizations (.edu, .gov, NGOs).", 8, "Institutional" },
                    { new Guid("d0000000-0000-0000-0000-000000000009"), "Reference", "Encyclopedias, knowledge bases, and glossaries such as Wikipedia and MDN.", 9, "Reference" },
                    { new Guid("d0000000-0000-0000-0000-000000000010"), "Marketplace", "E-commerce platforms and product listing services such as Amazon and app stores.", 10, "Marketplace" },
                    { new Guid("d0000000-0000-0000-0000-000000000011"), "Other", "Sources that don't fit any of the more specific categories.", 11, "Other" },
                    { new Guid("d0000000-0000-0000-0000-000000000012"), "Unknown", "Source type could not be determined by the classifier.", 12, "Unknown" }
                });

            migrationBuilder.InsertData(
                table: "lenses",
                columns: new[] { "id", "code", "description", "display_order", "name" },
                values: new object[,]
                {
                    { new Guid("c0000000-0000-0000-0000-000000000001"), "Discovery", "Does the AI surface the brand when asked about the category or topic?", 1, "Discovery" },
                    { new Guid("c0000000-0000-0000-0000-000000000002"), "BuyingIntent", "Is the brand recommended for high-intent, purchase-oriented prompts?", 2, "Buying Intent" },
                    { new Guid("c0000000-0000-0000-0000-000000000003"), "CompetitorComparison", "How does the AI compare the brand against its competitors?", 3, "Competitor Comparison" },
                    { new Guid("c0000000-0000-0000-0000-000000000004"), "SentimentAndTrust", "What sentiment and trust signals does the AI express about the brand?", 4, "Sentiment & Trust" },
                    { new Guid("c0000000-0000-0000-0000-000000000005"), "CitationVisibility", "Is the brand's own content cited as a source in AI answers?", 5, "Citation Visibility" },
                    { new Guid("c0000000-0000-0000-0000-000000000006"), "ContentGaps", "Where is the brand absent from AI answers when it should be present?", 6, "Content Gaps" }
                });

            var initialSeedAt = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
            migrationBuilder.InsertData(
                table: "prompt_templates",
                columns: new[] { "id", "lens_id", "name", "template_text", "is_active", "created_at" },
                values: new object[,]
                {
                    { new Guid("70000000-0000-0000-0000-000000000101"), new Guid("c0000000-0000-0000-0000-000000000001"), "Category discovery", "What are the best {category} options in {market}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000102"), new Guid("c0000000-0000-0000-0000-000000000001"), "Category recommendation", "Which {category} would you recommend in {market}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000103"), new Guid("c0000000-0000-0000-0000-000000000001"), "Leading providers", "Who are the leading {category} providers right now?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000201"), new Guid("c0000000-0000-0000-0000-000000000002"), "Buying intent", "I want to buy {category} for {topic} — which do you recommend?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000202"), new Guid("c0000000-0000-0000-0000-000000000002"), "Budget choice", "What's the best {category} for {topic} on a budget?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000203"), new Guid("c0000000-0000-0000-0000-000000000002"), "Ready to choose", "I'm ready to choose a {category} for {topic} — what should I go with?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000301"), new Guid("c0000000-0000-0000-0000-000000000003"), "Head to head", "How does {brand} compare to {competitor} for {category}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000302"), new Guid("c0000000-0000-0000-0000-000000000003"), "Which is better", "Is {brand} or {competitor} the better {category}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000303"), new Guid("c0000000-0000-0000-0000-000000000003"), "Key differences", "What are the main differences between {brand} and {competitor}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000401"), new Guid("c0000000-0000-0000-0000-000000000004"), "Reliability", "Is {brand} a reliable {category}? What is its reputation?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000402"), new Guid("c0000000-0000-0000-0000-000000000004"), "Reviews", "What do people say about {brand}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000403"), new Guid("c0000000-0000-0000-0000-000000000004"), "Trust", "Can I trust {brand} for {category}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000501"), new Guid("c0000000-0000-0000-0000-000000000005"), "Authoritative sources", "What are the most authoritative sources about {topic} in {category}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000502"), new Guid("c0000000-0000-0000-0000-000000000005"), "Experts to follow", "Which experts or publications should I follow on {topic}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000503"), new Guid("c0000000-0000-0000-0000-000000000005"), "Trustworthy info", "Where can I find trustworthy information about {topic}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000601"), new Guid("c0000000-0000-0000-0000-000000000006"), "Considerations", "What should I consider about {topic} when choosing a {category}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000602"), new Guid("c0000000-0000-0000-0000-000000000006"), "Questions to ask", "What questions should I ask about {topic} before choosing a {category}?", true, initialSeedAt },
                    { new Guid("70000000-0000-0000-0000-000000000603"), new Guid("c0000000-0000-0000-0000-000000000006"), "Overlooked factors", "What do most people overlook about {topic} when it comes to {category}?", true, initialSeedAt }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_answers_prompt_run_id",
                table: "ai_answers",
                column: "prompt_run_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ai_platforms_code",
                table: "ai_platforms",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_analysis_jobs_scan_run_id",
                table: "analysis_jobs",
                column: "scan_run_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_analysis_jobs_status",
                table: "analysis_jobs",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_answer_recommendations_ai_answer_id",
                table: "answer_recommendations",
                column: "ai_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_answer_recommendations_normalized_name",
                table: "answer_recommendations",
                column: "normalized_name");

            migrationBuilder.CreateIndex(
                name: "IX_answer_signals_ai_answer_id",
                table: "answer_signals",
                column: "ai_answer_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_audiences_brand_id",
                table: "audiences",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_audiences_discovery_run_id",
                table: "audiences",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_brand_profiles_brand_id",
                table: "brand_profiles",
                column: "brand_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_brand_profiles_discovery_run_id",
                table: "brand_profiles",
                column: "discovery_run_id");

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
                name: "IX_citations_ai_answer_id",
                table: "citations",
                column: "ai_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_citations_source_id",
                table: "citations",
                column: "source_id");

            migrationBuilder.CreateIndex(
                name: "IX_citations_source_url_id",
                table: "citations",
                column: "source_url_id");

            migrationBuilder.CreateIndex(
                name: "IX_competitors_brand_id",
                table: "competitors",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_competitors_discovery_run_id",
                table: "competitors",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_crawled_pages_discovery_run_id",
                table: "crawled_pages",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "ix_crawled_pages_run_url",
                table: "crawled_pages",
                columns: new[] { "discovery_run_id", "url" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_discovery_runs_brand_id",
                table: "discovery_runs",
                column: "brand_id",
                unique: true);

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

            migrationBuilder.CreateIndex(
                name: "IX_lenses_code",
                table: "lenses",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lenses_display_order",
                table: "lenses",
                column: "display_order",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_markets_brand_id",
                table: "markets",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_markets_discovery_run_id",
                table: "markets",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_attributes_mention_id",
                table: "mention_attributes",
                column: "mention_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_attributes_name",
                table: "mention_attributes",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "IX_mention_candidates_ai_answer_id",
                table: "mention_candidates",
                column: "ai_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_candidates_claimed_entity_type_normalized_name",
                table: "mention_candidates",
                columns: new[] { "claimed_entity_type", "normalized_name" });

            migrationBuilder.CreateIndex(
                name: "IX_mention_comparisons_mention_id",
                table: "mention_comparisons",
                column: "mention_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_comparisons_on_aspect",
                table: "mention_comparisons",
                column: "on_aspect");

            migrationBuilder.CreateIndex(
                name: "IX_mention_comparisons_vs_entity_normalized",
                table: "mention_comparisons",
                column: "vs_entity_normalized");

            migrationBuilder.CreateIndex(
                name: "IX_mention_pairs_ai_answer_id",
                table: "mention_pairs",
                column: "ai_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_pairs_ai_answer_id_mention_a_id_mention_b_id",
                table: "mention_pairs",
                columns: new[] { "ai_answer_id", "mention_a_id", "mention_b_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_mention_pairs_mention_a_id",
                table: "mention_pairs",
                column: "mention_a_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_pairs_mention_b_id",
                table: "mention_pairs",
                column: "mention_b_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_recommendation_contexts_context_type_context_value",
                table: "mention_recommendation_contexts",
                columns: new[] { "context_type", "context_value" });

            migrationBuilder.CreateIndex(
                name: "IX_mention_recommendation_contexts_mention_id",
                table: "mention_recommendation_contexts",
                column: "mention_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_risk_flags_flag_type",
                table: "mention_risk_flags",
                column: "flag_type");

            migrationBuilder.CreateIndex(
                name: "IX_mention_risk_flags_mention_id",
                table: "mention_risk_flags",
                column: "mention_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_topic_recommendations_mention_id",
                table: "mention_topic_recommendations",
                column: "mention_id");

            migrationBuilder.CreateIndex(
                name: "IX_mention_topic_recommendations_topic_normalized",
                table: "mention_topic_recommendations",
                column: "topic_normalized");

            migrationBuilder.CreateIndex(
                name: "IX_mentions_ai_answer_id",
                table: "mentions",
                column: "ai_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_mentions_entity_type_entity_id",
                table: "mentions",
                columns: new[] { "entity_type", "entity_id" });

            migrationBuilder.CreateIndex(
                name: "IX_products_brand_id",
                table: "products",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_products_discovery_run_id",
                table: "products",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_audiences_audience_id",
                table: "prompt_audiences",
                column: "audience_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_competitors_competitor_id",
                table: "prompt_competitors",
                column: "competitor_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_markets_market_id",
                table: "prompt_markets",
                column: "market_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_products_product_id",
                table: "prompt_products",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_runs_ai_platform_id",
                table: "prompt_runs",
                column: "ai_platform_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_runs_prompt_id",
                table: "prompt_runs",
                column: "prompt_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_runs_scan_run_id",
                table: "prompt_runs",
                column: "scan_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_runs_status",
                table: "prompt_runs",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_templates_lens_id",
                table: "prompt_templates",
                column: "lens_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_topics_topic_id",
                table: "prompt_topics",
                column: "topic_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompts_lens_id",
                table: "prompts",
                column: "lens_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompts_prompt_template_id",
                table: "prompts",
                column: "prompt_template_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompts_tracker_status",
                table: "prompts",
                columns: new[] { "tracker_configuration_id", "status" });

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

            migrationBuilder.CreateIndex(
                name: "IX_scan_runs_status",
                table: "scan_runs",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_scan_runs_tracker_configuration_id",
                table: "scan_runs",
                column: "tracker_configuration_id");

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
                name: "IX_topics_brand_id",
                table: "topics",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_topics_discovery_run_id",
                table: "topics",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_audiences_audience_id",
                table: "tracker_audiences",
                column: "audience_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_competitors_competitor_id",
                table: "tracker_competitors",
                column: "competitor_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_configurations_brand_id",
                table: "tracker_configurations",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_lenses_lens_id",
                table: "tracker_lenses",
                column: "lens_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_markets_market_id",
                table: "tracker_markets",
                column: "market_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_platforms_ai_platform_id",
                table: "tracker_platforms",
                column: "ai_platform_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_products_product_id",
                table: "tracker_products",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_topics_topic_id",
                table: "tracker_topics",
                column: "topic_id");

            migrationBuilder.CreateIndex(
                name: "IX_trend_points_scan_run_id",
                table: "trend_points",
                column: "scan_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_trend_points_tracker_configuration_id_captured_at",
                table: "trend_points",
                columns: new[] { "tracker_configuration_id", "captured_at" });

            migrationBuilder.CreateIndex(
                name: "IX_trend_points_tracker_configuration_id_scan_run_id_entity_ty~",
                table: "trend_points",
                columns: new[] { "tracker_configuration_id", "scan_run_id", "entity_type", "entity_id", "metric_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trust_signals_brand_id",
                table: "trust_signals",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_trust_signals_discovery_run_id",
                table: "trust_signals",
                column: "discovery_run_id");

            // Case-insensitive unique index on (workspace_id, LOWER(name)) so
            // "Nostri", "nostri", and "NOSTRI" cannot co-exist in the same
            // workspace. EF Core can't express function-based indexes
            // fluently, so raw SQL is the only path here.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_brands_workspace_lower_name " +
                "ON brands (workspace_id, LOWER(name))");

            // Case-insensitive unique index on (brand_id, LOWER(name)) for
            // competitors. Same shape as the brands index — catches dupes
            // when the LLM emits two name-variants within a single
            // discovery run.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_competitors_brand_lower_name " +
                "ON competitors (brand_id, LOWER(name))");

            // CHECK constraint enforcing the citations type/URL invariant:
            // citation_type = 'ExplicitUrl' iff source_url_id IS NOT NULL.
            // Prevents a mis-classified row from landing inconsistent state.
            migrationBuilder.Sql(
                "ALTER TABLE citations ADD CONSTRAINT chk_citations_type_url_consistency " +
                "CHECK ((citation_type = 'ExplicitUrl') = (source_url_id IS NOT NULL))");

            // Case-insensitive unique index on (brand_id, LOWER(name)) for
            // markets — matches the brands/competitors pattern and prevents
            // duplicate market rows under the same brand.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_markets_brand_lower_name " +
                "ON markets (brand_id, LOWER(name))");

            // Enforce ISO-3166 alpha-2 shape on country_code (uppercase,
            // exactly two letters). NULL allowed for non-country markets
            // like "Global" or "Europe".
            migrationBuilder.Sql(
                "ALTER TABLE markets ADD CONSTRAINT chk_markets_country_code_iso2 " +
                "CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')");

            // Case-insensitive unique index on (brand_id, LOWER(name)) for
            // products — matches the brands/competitors/markets pattern.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_products_brand_lower_name " +
                "ON products (brand_id, LOWER(name))");

            // CHECK constraint: prompt_allocation must be positive. Guards
            // against a user/admin path setting it to 0 or negative, which
            // would silently break prompt generation.
            migrationBuilder.Sql(
                "ALTER TABLE tracker_configurations ADD CONSTRAINT chk_tracker_configurations_prompt_allocation_positive " +
                "CHECK (prompt_allocation > 0)");

            // Case-insensitive unique index on (brand_id, LOWER(name)) for
            // tracker_configurations — prevents two trackers under the same
            // brand sharing a name.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_tracker_configurations_brand_lower_name " +
                "ON tracker_configurations (brand_id, LOWER(name))");

            // Partial index on next_run_at filtered to Active trackers so the
            // scheduler's `WHERE status = 'Active' AND next_run_at <= now()`
            // probe stays index-driven as tracker count grows.
            migrationBuilder.Sql(
                "CREATE INDEX ix_tracker_configurations_next_run_at_active " +
                "ON tracker_configurations (next_run_at) WHERE status = 'Active'");

            // Partial UNIQUE index on sources.normalized_domain when present —
            // enforces the writer's dedup-by-domain invariant against
            // concurrent inserts. Doubles as the lookup index for the
            // "match by domain" path in AnswerSignalWriter.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_sources_normalized_domain_unique " +
                "ON sources (normalized_domain) WHERE normalized_domain IS NOT NULL");

            // Partial UNIQUE index on LOWER(sources.source_name) when domain
            // is absent — enforces dedup for mentioned-source citations
            // without a URL. Function-based, so it also backs the
            // LOWER(source_name) lookup in the writer.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_sources_lower_source_name_unique " +
                "ON sources (LOWER(source_name)) WHERE normalized_domain IS NULL");

            // CHECK constraint enforcing the curated authority score range
            // (0-100, see Source.AuthorityScore doc-comment).
            migrationBuilder.Sql(
                "ALTER TABLE sources ADD CONSTRAINT chk_sources_authority_score_range " +
                "CHECK (authority_score IS NULL OR authority_score BETWEEN 0 AND 100)");

            // Case-insensitive unique index on (brand_id, LOWER(name)) for
            // topics — matches the brands/competitors/markets/products
            // pattern.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_topics_brand_lower_name " +
                "ON topics (brand_id, LOWER(name))");

            // Case-insensitive unique index on (brand_id, LOWER(name)) for
            // trust_signals — final brand-scoped candidate to receive the
            // pattern.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_trust_signals_brand_lower_name " +
                "ON trust_signals (brand_id, LOWER(name))");

            // CHECK constraint: trend_points must store at most one value
            // (numeric OR categorical), never both. The entity doc-comment
            // states "exactly one of those is non-null per row"; in practice
            // properties allow both null when source data is sparse, but
            // both non-null is a bug.
            migrationBuilder.Sql(
                "ALTER TABLE trend_points ADD CONSTRAINT chk_trend_points_value_exclusive " +
                "CHECK (NOT (numeric_value IS NOT NULL AND categorical_value IS NOT NULL))");

            // Sweep: confidence is a 0-1 fractional score across every
            // discovery-candidate table. CHECK constraints catch off-by-100
            // bugs (LLM emitting "85" instead of "0.85") at write time.
            migrationBuilder.Sql(
                "ALTER TABLE brand_profiles ADD CONSTRAINT chk_brand_profiles_confidence_range " +
                "CHECK (confidence BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE audiences ADD CONSTRAINT chk_audiences_confidence_range " +
                "CHECK (confidence BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE markets ADD CONSTRAINT chk_markets_confidence_range " +
                "CHECK (confidence BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE products ADD CONSTRAINT chk_products_confidence_range " +
                "CHECK (confidence BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE topics ADD CONSTRAINT chk_topics_confidence_range " +
                "CHECK (confidence BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE competitors ADD CONSTRAINT chk_competitors_confidence_range " +
                "CHECK (confidence BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE trust_signals ADD CONSTRAINT chk_trust_signals_confidence_range " +
                "CHECK (confidence BETWEEN 0 AND 1)");

            // Sweep: enum-stored-as-string CHECK constraints. Every column
            // declared via EF's HasConversion<string>() pattern stores the
            // C# enum's ToString() form. CHECKs codify the valid set at the
            // DB level so raw-SQL writes / data-fixup scripts can't drift
            // from the application's enum universe.

            // CandidateSource: WebsiteCrawl, LLMSuggested, UserAdded.
            // Applies to .source columns on every discovery-candidate table.
            const string candidateSourceValues = "('WebsiteCrawl','LLMSuggested','UserAdded')";
            migrationBuilder.Sql(
                "ALTER TABLE brand_profiles ADD CONSTRAINT chk_brand_profiles_source_enum " +
                "CHECK (source IN " + candidateSourceValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE audiences ADD CONSTRAINT chk_audiences_source_enum " +
                "CHECK (source IN " + candidateSourceValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE markets ADD CONSTRAINT chk_markets_source_enum " +
                "CHECK (source IN " + candidateSourceValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE products ADD CONSTRAINT chk_products_source_enum " +
                "CHECK (source IN " + candidateSourceValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE topics ADD CONSTRAINT chk_topics_source_enum " +
                "CHECK (source IN " + candidateSourceValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE competitors ADD CONSTRAINT chk_competitors_source_enum " +
                "CHECK (source IN " + candidateSourceValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE trust_signals ADD CONSTRAINT chk_trust_signals_source_enum " +
                "CHECK (source IN " + candidateSourceValues + ")");

            // Tracker lifecycle.
            migrationBuilder.Sql(
                "ALTER TABLE tracker_configurations ADD CONSTRAINT chk_tracker_configurations_cadence_enum " +
                "CHECK (cadence IN ('OnDemand','Daily','Weekly'))");
            migrationBuilder.Sql(
                "ALTER TABLE tracker_configurations ADD CONSTRAINT chk_tracker_configurations_status_enum " +
                "CHECK (status IN ('Draft','Active','Paused','Archived'))");

            // Prompt lifecycle.
            migrationBuilder.Sql(
                "ALTER TABLE prompts ADD CONSTRAINT chk_prompts_status_enum " +
                "CHECK (status IN ('Draft','Active','Paused','Archived'))");
            migrationBuilder.Sql(
                "ALTER TABLE prompts ADD CONSTRAINT chk_prompts_source_enum " +
                "CHECK (source IN ('Generated','UserAdded'))");

            // Domain-specific type enums.
            migrationBuilder.Sql(
                "ALTER TABLE products ADD CONSTRAINT chk_products_product_type_enum " +
                "CHECK (product_type IN ('Product','Service','Feature','Solution','Tool','Resource'))");
            migrationBuilder.Sql(
                "ALTER TABLE trust_signals ADD CONSTRAINT chk_trust_signals_signal_type_enum " +
                "CHECK (signal_type IN ('AwardsAndRecognitions','CertificationsAndAccreditations'," +
                "'PressAndMediaMentions','TestimonialsAndReviews','ExpertEndorsements'," +
                "'CaseStudiesAndSuccessMetrics','ClientAndPartnerLogos'))");

            // Citation + source classification.
            migrationBuilder.Sql(
                "ALTER TABLE citations ADD CONSTRAINT chk_citations_citation_type_enum " +
                "CHECK (citation_type IN ('ExplicitUrl','MentionedSource'))");
            migrationBuilder.Sql(
                "ALTER TABLE brand_source_classifications ADD CONSTRAINT chk_brand_source_classifications_source_type_enum " +
                "CHECK (source_type IN ('Owned','Competitor','Corporate','UGC','Editorial','ReviewSite'," +
                "'Social','Institutional','Reference','Marketplace','Other','Unknown'))");
            migrationBuilder.Sql(
                "ALTER TABLE brand_source_classifications ADD CONSTRAINT chk_brand_source_classifications_provenance_source_enum " +
                "CHECK (provenance_source IN ('RuleBased','LLMClassified','UserCorrected'))");
            migrationBuilder.Sql(
                "ALTER TABLE brand_source_classifications ADD CONSTRAINT chk_brand_source_classifications_status_enum " +
                "CHECK (status IN ('Active','UserCorrected','Unknown'))");

            // Run / job lifecycle.
            migrationBuilder.Sql(
                "ALTER TABLE discovery_runs ADD CONSTRAINT chk_discovery_runs_status_enum " +
                "CHECK (status IN ('Pending','Crawling','Extracting','AwaitingConfirmation','Completed','Failed'))");
            migrationBuilder.Sql(
                "ALTER TABLE scan_runs ADD CONSTRAINT chk_scan_runs_trigger_type_enum " +
                "CHECK (trigger_type IN ('Manual','Scheduled','Retry'))");
            migrationBuilder.Sql(
                "ALTER TABLE scan_runs ADD CONSTRAINT chk_scan_runs_status_enum " +
                "CHECK (status IN ('Pending','Running','Completed','Failed'))");
            migrationBuilder.Sql(
                "ALTER TABLE prompt_runs ADD CONSTRAINT chk_prompt_runs_status_enum " +
                "CHECK (status IN ('Pending','Running','Completed','Failed'))");
            migrationBuilder.Sql(
                "ALTER TABLE analysis_jobs ADD CONSTRAINT chk_analysis_jobs_status_enum " +
                "CHECK (status IN ('Queued','Running','Completed','Failed'))");

            // Sentiment / strength values shared across answer_signals + mentions.
            const string sentimentValues = "('Positive','Neutral','Negative','Mixed','Unknown')";
            const string strengthValues = "('Strong','Moderate','Weak','NotRecommended','Unknown')";
            migrationBuilder.Sql(
                "ALTER TABLE answer_signals ADD CONSTRAINT chk_answer_signals_brand_sentiment_enum " +
                "CHECK (brand_sentiment IN " + sentimentValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE answer_signals ADD CONSTRAINT chk_answer_signals_brand_recommendation_strength_enum " +
                "CHECK (brand_recommendation_strength IN " + strengthValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE mentions ADD CONSTRAINT chk_mentions_sentiment_enum " +
                "CHECK (sentiment IN " + sentimentValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE mentions ADD CONSTRAINT chk_mentions_recommendation_strength_enum " +
                "CHECK (recommendation_strength IN " + strengthValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE mention_topic_recommendations ADD CONSTRAINT chk_mention_topic_recommendations_strength_enum " +
                "CHECK (strength IN " + strengthValues + ")");

            // Polymorphic entity-type discriminators.
            const string mentionEntityValues = "('Brand','Competitor','Product')";
            migrationBuilder.Sql(
                "ALTER TABLE mentions ADD CONSTRAINT chk_mentions_entity_type_enum " +
                "CHECK (entity_type IN " + mentionEntityValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE mention_candidates ADD CONSTRAINT chk_mention_candidates_claimed_entity_type_enum " +
                "CHECK (claimed_entity_type IN " + mentionEntityValues + ")");
            migrationBuilder.Sql(
                "ALTER TABLE trend_points ADD CONSTRAINT chk_trend_points_entity_type_enum " +
                "CHECK (entity_type IN ('Brand','Competitor'))");

            // Mention-side classifiers.
            migrationBuilder.Sql(
                "ALTER TABLE mention_attributes ADD CONSTRAINT chk_mention_attributes_polarity_enum " +
                "CHECK (polarity IN ('Positive','Neutral','Negative'))");
            migrationBuilder.Sql(
                "ALTER TABLE mention_recommendation_contexts ADD CONSTRAINT chk_mention_recommendation_contexts_context_type_enum " +
                "CHECK (context_type IN ('RecommendedFor','WithCaveats'))");
            migrationBuilder.Sql(
                "ALTER TABLE mention_risk_flags ADD CONSTRAINT chk_mention_risk_flags_severity_enum " +
                "CHECK (severity IN ('Low','Medium','High'))");

            // Factual claim review pipeline.
            migrationBuilder.Sql(
                "ALTER TABLE factual_claims ADD CONSTRAINT chk_factual_claims_verifiability_enum " +
                "CHECK (verifiability IN ('Verifiable','Subjective','Unverifiable'))");
            migrationBuilder.Sql(
                "ALTER TABLE factual_claims ADD CONSTRAINT chk_factual_claims_review_status_enum " +
                "CHECK (review_status IN ('Pending','Verified','Disputed'))");

            // Scan metric scope.
            migrationBuilder.Sql(
                "ALTER TABLE scan_metrics ADD CONSTRAINT chk_scan_metrics_scope_enum " +
                "CHECK (scope IN ('Overall','Platform','Topic','Lens','Competitor'))");

            // Sweep: numeric-range CHECKs missed by the initial confidence pass.
            // Counts/ranks/positions can never be negative; signed sentiment +
            // recommendation scores are clamped to [-1, +1] per the entity
            // doc-comments; remaining confidence_score columns are [0, 1].

            // Non-negative counters.
            migrationBuilder.Sql(
                "ALTER TABLE analysis_jobs ADD CONSTRAINT chk_analysis_jobs_aggregate_retry_count_nonneg " +
                "CHECK (aggregate_retry_count >= 0)");
            migrationBuilder.Sql(
                "ALTER TABLE discovery_runs ADD CONSTRAINT chk_discovery_runs_pages_crawled_nonneg " +
                "CHECK (pages_crawled >= 0)");
            migrationBuilder.Sql(
                "ALTER TABLE answer_signals ADD CONSTRAINT chk_answer_signals_source_counts_nonneg " +
                "CHECK (owned_source_count >= 0 AND competitor_source_count >= 0)");
            migrationBuilder.Sql(
                "ALTER TABLE scan_runs ADD CONSTRAINT chk_scan_runs_counts_nonneg " +
                "CHECK (prompt_count >= 0 AND platform_count >= 0 AND scan_check_count >= 0 " +
                "AND completed_count >= 0 AND failed_count >= 0)");

            // 1-based ranks / positions when present.
            migrationBuilder.Sql(
                "ALTER TABLE answer_signals ADD CONSTRAINT chk_answer_signals_brand_rank_positive " +
                "CHECK (brand_rank IS NULL OR brand_rank >= 1)");
            migrationBuilder.Sql(
                "ALTER TABLE answer_signals ADD CONSTRAINT chk_answer_signals_brand_rank_universe_size_positive " +
                "CHECK (brand_rank_universe_size IS NULL OR brand_rank_universe_size >= 1)");
            migrationBuilder.Sql(
                "ALTER TABLE citations ADD CONSTRAINT chk_citations_position_positive " +
                "CHECK (citation_position IS NULL OR citation_position >= 1)");

            // [0, 1] confidence scores.
            migrationBuilder.Sql(
                "ALTER TABLE answer_signals ADD CONSTRAINT chk_answer_signals_confidence_score_range " +
                "CHECK (confidence_score BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE answer_signals ADD CONSTRAINT chk_answer_signals_answer_certainty_range " +
                "CHECK (answer_certainty BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE brand_source_classifications ADD CONSTRAINT chk_brand_source_classifications_confidence_score_range " +
                "CHECK (confidence_score BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE citations ADD CONSTRAINT chk_citations_confidence_score_range " +
                "CHECK (confidence_score BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE factual_claims ADD CONSTRAINT chk_factual_claims_confidence_score_range " +
                "CHECK (confidence_score BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE mention_attributes ADD CONSTRAINT chk_mention_attributes_confidence_score_range " +
                "CHECK (confidence_score BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE mention_candidates ADD CONSTRAINT chk_mention_candidates_confidence_score_range " +
                "CHECK (confidence_score BETWEEN 0 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE mentions ADD CONSTRAINT chk_mentions_confidence_score_range " +
                "CHECK (confidence_score BETWEEN 0 AND 1)");

            // [-1, +1] signed sentiment and recommendation scores.
            migrationBuilder.Sql(
                "ALTER TABLE answer_signals ADD CONSTRAINT chk_answer_signals_brand_sentiment_score_range " +
                "CHECK (brand_sentiment_score BETWEEN -1 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE answer_signals ADD CONSTRAINT chk_answer_signals_brand_recommendation_score_range " +
                "CHECK (brand_recommendation_score BETWEEN -1 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE mentions ADD CONSTRAINT chk_mentions_sentiment_score_range " +
                "CHECK (sentiment_score BETWEEN -1 AND 1)");
            migrationBuilder.Sql(
                "ALTER TABLE mentions ADD CONSTRAINT chk_mentions_recommendation_score_range " +
                "CHECK (recommendation_score BETWEEN -1 AND 1)");

            // Case-insensitive unique index on (lens_id, LOWER(name)) for
            // prompt_templates — prevents two templates with the same name
            // under one lens.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ix_prompt_templates_lens_lower_name " +
                "ON prompt_templates (lens_id, LOWER(name))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "analysis_jobs");

            migrationBuilder.DropTable(
                name: "answer_recommendations");

            migrationBuilder.DropTable(
                name: "answer_signals");

            migrationBuilder.DropTable(
                name: "audiences");

            migrationBuilder.DropTable(
                name: "brand_profiles");

            migrationBuilder.DropTable(
                name: "brand_source_classifications");

            migrationBuilder.DropTable(
                name: "citations");

            migrationBuilder.DropTable(
                name: "competitors");

            migrationBuilder.DropTable(
                name: "crawled_pages");

            migrationBuilder.DropTable(
                name: "factual_claims");

            migrationBuilder.DropTable(
                name: "lenses");

            migrationBuilder.DropTable(
                name: "markets");

            migrationBuilder.DropTable(
                name: "mention_attributes");

            migrationBuilder.DropTable(
                name: "mention_candidates");

            migrationBuilder.DropTable(
                name: "mention_comparisons");

            migrationBuilder.DropTable(
                name: "mention_pairs");

            migrationBuilder.DropTable(
                name: "mention_recommendation_contexts");

            migrationBuilder.DropTable(
                name: "mention_risk_flags");

            migrationBuilder.DropTable(
                name: "mention_topic_recommendations");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "prompt_audiences");

            migrationBuilder.DropTable(
                name: "prompt_competitors");

            migrationBuilder.DropTable(
                name: "prompt_markets");

            migrationBuilder.DropTable(
                name: "prompt_products");

            migrationBuilder.DropTable(
                name: "prompt_templates");

            migrationBuilder.DropTable(
                name: "prompt_topics");

            migrationBuilder.DropTable(
                name: "scan_metrics");

            migrationBuilder.DropTable(
                name: "source_types");

            migrationBuilder.DropTable(
                name: "topics");

            migrationBuilder.DropTable(
                name: "tracker_audiences");

            migrationBuilder.DropTable(
                name: "tracker_competitors");

            migrationBuilder.DropTable(
                name: "tracker_lenses");

            migrationBuilder.DropTable(
                name: "tracker_markets");

            migrationBuilder.DropTable(
                name: "tracker_platforms");

            migrationBuilder.DropTable(
                name: "tracker_products");

            migrationBuilder.DropTable(
                name: "tracker_topics");

            migrationBuilder.DropTable(
                name: "trend_points");

            migrationBuilder.DropTable(
                name: "trust_signals");

            migrationBuilder.DropTable(
                name: "source_urls");

            migrationBuilder.DropTable(
                name: "mentions");

            migrationBuilder.DropTable(
                name: "discovery_runs");

            migrationBuilder.DropTable(
                name: "sources");

            migrationBuilder.DropTable(
                name: "ai_answers");

            migrationBuilder.DropTable(
                name: "prompt_runs");

            migrationBuilder.DropTable(
                name: "ai_platforms");

            migrationBuilder.DropTable(
                name: "prompts");

            migrationBuilder.DropTable(
                name: "scan_runs");

            migrationBuilder.DropTable(
                name: "tracker_configurations");

            migrationBuilder.DropTable(
                name: "brands");
        }
    }
}
