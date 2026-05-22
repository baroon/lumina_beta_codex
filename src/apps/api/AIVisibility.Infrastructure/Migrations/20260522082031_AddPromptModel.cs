using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPromptModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "prompt_templates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    visibility_check_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    template_text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prompt_templates", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "prompts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tracker_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    prompt_text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    visibility_check_id = table.Column<Guid>(type: "uuid", nullable: false),
                    primary_topic_id = table.Column<Guid>(type: "uuid", nullable: true),
                    prompt_template_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    replaces_prompt_id = table.Column<Guid>(type: "uuid", nullable: true),
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

            migrationBuilder.InsertData(
                table: "prompt_templates",
                columns: new[] { "id", "display_order", "name", "template_text", "visibility_check_id" },
                values: new object[,]
                {
                    { new Guid("70000000-0000-0000-0000-000000000001"), 1, "Category discovery", "What are the best {category} options in {market}?", new Guid("c0000000-0000-0000-0000-000000000001") },
                    { new Guid("70000000-0000-0000-0000-000000000002"), 2, "Buying intent", "I want to buy {category} for {topic} — which do you recommend?", new Guid("c0000000-0000-0000-0000-000000000002") },
                    { new Guid("70000000-0000-0000-0000-000000000003"), 3, "Competitor comparison", "How does {brand} compare to {competitor} for {category}?", new Guid("c0000000-0000-0000-0000-000000000003") },
                    { new Guid("70000000-0000-0000-0000-000000000004"), 4, "Sentiment & trust", "Is {brand} a reliable {category}? What is its reputation?", new Guid("c0000000-0000-0000-0000-000000000004") },
                    { new Guid("70000000-0000-0000-0000-000000000005"), 5, "Citation visibility", "What are the most authoritative sources about {topic} in {category}?", new Guid("c0000000-0000-0000-0000-000000000005") },
                    { new Guid("70000000-0000-0000-0000-000000000006"), 6, "Content gaps", "What should I consider about {topic} when choosing a {category}?", new Guid("c0000000-0000-0000-0000-000000000006") }
                });

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
                name: "IX_prompt_templates_visibility_check_id",
                table: "prompt_templates",
                column: "visibility_check_id");

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
                name: "prompts");
        }
    }
}
