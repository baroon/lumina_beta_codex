using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTrackerSetup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                    timezone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
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
                name: "visibility_checks",
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
                    table.PrimaryKey("PK_visibility_checks", x => x.id);
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
                name: "tracker_visibility_checks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    visibility_check_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracker_visibility_checks", x => x.id);
                    table.ForeignKey(
                        name: "FK_tracker_visibility_checks_tracker_configurations_tracker_co~",
                        column: x => x.tracker_configuration_id,
                        principalTable: "tracker_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "visibility_checks",
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
                name: "IX_tracker_markets_tracker_configuration_id",
                table: "tracker_markets",
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
                name: "IX_tracker_visibility_checks_tracker_configuration_id",
                table: "tracker_visibility_checks",
                column: "tracker_configuration_id");

            migrationBuilder.CreateIndex(
                name: "IX_visibility_checks_code",
                table: "visibility_checks",
                column: "code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tracker_audiences");

            migrationBuilder.DropTable(
                name: "tracker_competitors");

            migrationBuilder.DropTable(
                name: "tracker_markets");

            migrationBuilder.DropTable(
                name: "tracker_products");

            migrationBuilder.DropTable(
                name: "tracker_topics");

            migrationBuilder.DropTable(
                name: "tracker_visibility_checks");

            migrationBuilder.DropTable(
                name: "visibility_checks");

            migrationBuilder.DropTable(
                name: "tracker_configurations");
        }
    }
}
