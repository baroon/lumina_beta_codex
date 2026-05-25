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
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
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
                    template_text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_templates", x => x.id);
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
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
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
                });

            migrationBuilder.CreateTable(
                name: "discovery_runs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
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
                name: "audiences",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false)
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
                name: "competitors",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    domain = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false)
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
                    headings = table.Column<string>(type: "jsonb", nullable: true),
                    extracted_text_blob_ref = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status_code = table.Column<int>(type: "integer", nullable: false)
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
                    country_code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false)
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
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    product_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false)
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
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false)
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
                    discovery_run_id = table.Column<Guid>(type: "uuid", nullable: false)
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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    audience_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_audiences", x => x.id);
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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    competitor_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_competitors", x => x.id);
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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lens_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_lenses", x => x.id);
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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    market_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_markets", x => x.id);
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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ai_platform_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_platforms", x => x.id);
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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_products", x => x.id);
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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_topics", x => x.id);
                    table.ForeignKey(
                        name: "FK_tracker_topics_tracker_configurations_tracker_configuration~",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prompt_audiences",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prompt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    audience_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_audiences", x => x.id);
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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prompt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    competitor_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_competitors", x => x.id);
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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prompt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    market_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_markets", x => x.id);
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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prompt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_products", x => x.id);
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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prompt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_topics", x => x.id);
                    table.ForeignKey(
                        name: "FK_prompt_topics_prompts_prompt_id",
                        column: x => x.prompt_id,
                        principalTable: "prompts",
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
                        name: "FK_prompt_runs_scan_runs_scan_run_id",
                        column: x => x.scan_run_id,
                        principalTable: "scan_runs",
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
                    raw_response = table.Column<string>(type: "text", nullable: true),
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

            migrationBuilder.InsertData(
                table: "prompt_templates",
                columns: new[] { "id", "lens_id", "name", "template_text" },
                values: new object[,]
                {
                    { new Guid("70000000-0000-0000-0000-000000000101"), new Guid("c0000000-0000-0000-0000-000000000001"), "Category discovery", "What are the best {category} options in {market}?" },
                    { new Guid("70000000-0000-0000-0000-000000000102"), new Guid("c0000000-0000-0000-0000-000000000001"), "Category recommendation", "Which {category} would you recommend in {market}?" },
                    { new Guid("70000000-0000-0000-0000-000000000103"), new Guid("c0000000-0000-0000-0000-000000000001"), "Leading providers", "Who are the leading {category} providers right now?" },
                    { new Guid("70000000-0000-0000-0000-000000000201"), new Guid("c0000000-0000-0000-0000-000000000002"), "Buying intent", "I want to buy {category} for {topic} — which do you recommend?" },
                    { new Guid("70000000-0000-0000-0000-000000000202"), new Guid("c0000000-0000-0000-0000-000000000002"), "Budget choice", "What's the best {category} for {topic} on a budget?" },
                    { new Guid("70000000-0000-0000-0000-000000000203"), new Guid("c0000000-0000-0000-0000-000000000002"), "Ready to choose", "I'm ready to choose a {category} for {topic} — what should I go with?" },
                    { new Guid("70000000-0000-0000-0000-000000000301"), new Guid("c0000000-0000-0000-0000-000000000003"), "Head to head", "How does {brand} compare to {competitor} for {category}?" },
                    { new Guid("70000000-0000-0000-0000-000000000302"), new Guid("c0000000-0000-0000-0000-000000000003"), "Which is better", "Is {brand} or {competitor} the better {category}?" },
                    { new Guid("70000000-0000-0000-0000-000000000303"), new Guid("c0000000-0000-0000-0000-000000000003"), "Key differences", "What are the main differences between {brand} and {competitor}?" },
                    { new Guid("70000000-0000-0000-0000-000000000401"), new Guid("c0000000-0000-0000-0000-000000000004"), "Reliability", "Is {brand} a reliable {category}? What is its reputation?" },
                    { new Guid("70000000-0000-0000-0000-000000000402"), new Guid("c0000000-0000-0000-0000-000000000004"), "Reviews", "What do people say about {brand}?" },
                    { new Guid("70000000-0000-0000-0000-000000000403"), new Guid("c0000000-0000-0000-0000-000000000004"), "Trust", "Can I trust {brand} for {category}?" },
                    { new Guid("70000000-0000-0000-0000-000000000501"), new Guid("c0000000-0000-0000-0000-000000000005"), "Authoritative sources", "What are the most authoritative sources about {topic} in {category}?" },
                    { new Guid("70000000-0000-0000-0000-000000000502"), new Guid("c0000000-0000-0000-0000-000000000005"), "Experts to follow", "Which experts or publications should I follow on {topic}?" },
                    { new Guid("70000000-0000-0000-0000-000000000503"), new Guid("c0000000-0000-0000-0000-000000000005"), "Trustworthy info", "Where can I find trustworthy information about {topic}?" },
                    { new Guid("70000000-0000-0000-0000-000000000601"), new Guid("c0000000-0000-0000-0000-000000000006"), "Considerations", "What should I consider about {topic} when choosing a {category}?" },
                    { new Guid("70000000-0000-0000-0000-000000000602"), new Guid("c0000000-0000-0000-0000-000000000006"), "Questions to ask", "What questions should I ask about {topic} before choosing a {category}?" },
                    { new Guid("70000000-0000-0000-0000-000000000603"), new Guid("c0000000-0000-0000-0000-000000000006"), "Overlooked factors", "What do most people overlook about {topic} when it comes to {category}?" }
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
                name: "IX_discovery_runs_brand_id",
                table: "discovery_runs",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_lenses_code",
                table: "lenses",
                column: "code",
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
                name: "IX_products_brand_id",
                table: "products",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_products_discovery_run_id",
                table: "products",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_audiences_prompt_id",
                table: "prompt_audiences",
                column: "prompt_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_competitors_prompt_id",
                table: "prompt_competitors",
                column: "prompt_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_markets_prompt_id",
                table: "prompt_markets",
                column: "prompt_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompt_products_prompt_id",
                table: "prompt_products",
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
                name: "IX_prompt_topics_prompt_id",
                table: "prompt_topics",
                column: "prompt_id");

            migrationBuilder.CreateIndex(
                name: "IX_prompts_status",
                table: "prompts",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_prompts_tracker_configuration_id",
                table: "prompts",
                column: "tracker_configuration_id");

            migrationBuilder.CreateIndex(
                name: "IX_scan_runs_status",
                table: "scan_runs",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_scan_runs_tracker_configuration_id",
                table: "scan_runs",
                column: "tracker_configuration_id");

            migrationBuilder.CreateIndex(
                name: "IX_topics_brand_id",
                table: "topics",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_topics_discovery_run_id",
                table: "topics",
                column: "discovery_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_audiences_tracker_configuration_id",
                table: "tracker_audiences",
                column: "tracker_configuration_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_competitors_tracker_configuration_id",
                table: "tracker_competitors",
                column: "tracker_configuration_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_configurations_brand_id",
                table: "tracker_configurations",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_lenses_tracker_configuration_id",
                table: "tracker_lenses",
                column: "tracker_configuration_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_markets_tracker_configuration_id",
                table: "tracker_markets",
                column: "tracker_configuration_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_platforms_tracker_configuration_id",
                table: "tracker_platforms",
                column: "tracker_configuration_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_products_tracker_configuration_id",
                table: "tracker_products",
                column: "tracker_configuration_id");

            migrationBuilder.CreateIndex(
                name: "IX_tracker_topics_tracker_configuration_id",
                table: "tracker_topics",
                column: "tracker_configuration_id");

            migrationBuilder.CreateIndex(
                name: "IX_trust_signals_brand_id",
                table: "trust_signals",
                column: "brand_id");

            migrationBuilder.CreateIndex(
                name: "IX_trust_signals_discovery_run_id",
                table: "trust_signals",
                column: "discovery_run_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_answers");

            migrationBuilder.DropTable(
                name: "ai_platforms");

            migrationBuilder.DropTable(
                name: "audiences");

            migrationBuilder.DropTable(
                name: "brand_profiles");

            migrationBuilder.DropTable(
                name: "competitors");

            migrationBuilder.DropTable(
                name: "crawled_pages");

            migrationBuilder.DropTable(
                name: "lenses");

            migrationBuilder.DropTable(
                name: "markets");

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
                name: "trust_signals");

            migrationBuilder.DropTable(
                name: "prompt_runs");

            migrationBuilder.DropTable(
                name: "prompts");

            migrationBuilder.DropTable(
                name: "discovery_runs");

            migrationBuilder.DropTable(
                name: "scan_runs");

            migrationBuilder.DropTable(
                name: "tracker_configurations");

            migrationBuilder.DropTable(
                name: "brands");
        }
    }
}
