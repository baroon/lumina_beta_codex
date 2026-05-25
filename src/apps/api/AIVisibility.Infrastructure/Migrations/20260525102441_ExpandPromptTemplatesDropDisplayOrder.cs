using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ExpandPromptTemplatesDropDisplayOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000004"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000005"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000006"));

            migrationBuilder.DropColumn(
                name: "display_order",
                table: "prompt_templates");

            migrationBuilder.InsertData(
                table: "prompt_templates",
                columns: new[] { "id", "name", "template_text", "visibility_check_id" },
                values: new object[,]
                {
                    { new Guid("70000000-0000-0000-0000-000000000101"), "Category discovery", "What are the best {category} options in {market}?", new Guid("c0000000-0000-0000-0000-000000000001") },
                    { new Guid("70000000-0000-0000-0000-000000000102"), "Category recommendation", "Which {category} would you recommend in {market}?", new Guid("c0000000-0000-0000-0000-000000000001") },
                    { new Guid("70000000-0000-0000-0000-000000000103"), "Leading providers", "Who are the leading {category} providers right now?", new Guid("c0000000-0000-0000-0000-000000000001") },
                    { new Guid("70000000-0000-0000-0000-000000000201"), "Buying intent", "I want to buy {category} for {topic} — which do you recommend?", new Guid("c0000000-0000-0000-0000-000000000002") },
                    { new Guid("70000000-0000-0000-0000-000000000202"), "Budget choice", "What's the best {category} for {topic} on a budget?", new Guid("c0000000-0000-0000-0000-000000000002") },
                    { new Guid("70000000-0000-0000-0000-000000000203"), "Ready to choose", "I'm ready to choose a {category} for {topic} — what should I go with?", new Guid("c0000000-0000-0000-0000-000000000002") },
                    { new Guid("70000000-0000-0000-0000-000000000301"), "Head to head", "How does {brand} compare to {competitor} for {category}?", new Guid("c0000000-0000-0000-0000-000000000003") },
                    { new Guid("70000000-0000-0000-0000-000000000302"), "Which is better", "Is {brand} or {competitor} the better {category}?", new Guid("c0000000-0000-0000-0000-000000000003") },
                    { new Guid("70000000-0000-0000-0000-000000000303"), "Key differences", "What are the main differences between {brand} and {competitor}?", new Guid("c0000000-0000-0000-0000-000000000003") },
                    { new Guid("70000000-0000-0000-0000-000000000401"), "Reliability", "Is {brand} a reliable {category}? What is its reputation?", new Guid("c0000000-0000-0000-0000-000000000004") },
                    { new Guid("70000000-0000-0000-0000-000000000402"), "Reviews", "What do people say about {brand}?", new Guid("c0000000-0000-0000-0000-000000000004") },
                    { new Guid("70000000-0000-0000-0000-000000000403"), "Trust", "Can I trust {brand} for {category}?", new Guid("c0000000-0000-0000-0000-000000000004") },
                    { new Guid("70000000-0000-0000-0000-000000000501"), "Authoritative sources", "What are the most authoritative sources about {topic} in {category}?", new Guid("c0000000-0000-0000-0000-000000000005") },
                    { new Guid("70000000-0000-0000-0000-000000000502"), "Experts to follow", "Which experts or publications should I follow on {topic}?", new Guid("c0000000-0000-0000-0000-000000000005") },
                    { new Guid("70000000-0000-0000-0000-000000000503"), "Trustworthy info", "Where can I find trustworthy information about {topic}?", new Guid("c0000000-0000-0000-0000-000000000005") },
                    { new Guid("70000000-0000-0000-0000-000000000601"), "Considerations", "What should I consider about {topic} when choosing a {category}?", new Guid("c0000000-0000-0000-0000-000000000006") },
                    { new Guid("70000000-0000-0000-0000-000000000602"), "Questions to ask", "What questions should I ask about {topic} before choosing a {category}?", new Guid("c0000000-0000-0000-0000-000000000006") },
                    { new Guid("70000000-0000-0000-0000-000000000603"), "Overlooked factors", "What do most people overlook about {topic} when it comes to {category}?", new Guid("c0000000-0000-0000-0000-000000000006") }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000101"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000102"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000103"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000201"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000202"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000203"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000301"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000302"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000303"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000401"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000402"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000403"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000501"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000502"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000503"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000601"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000602"));

            migrationBuilder.DeleteData(
                table: "prompt_templates",
                keyColumn: "id",
                keyValue: new Guid("70000000-0000-0000-0000-000000000603"));

            migrationBuilder.AddColumn<int>(
                name: "display_order",
                table: "prompt_templates",
                type: "integer",
                nullable: false,
                defaultValue: 0);

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
        }
    }
}
