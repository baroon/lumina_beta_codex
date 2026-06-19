using AIVisibility.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260619143000_AddNeedsContextClaimReviewStatus")]
public partial class AddNeedsContextClaimReviewStatus : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            "ALTER TABLE factual_claims DROP CONSTRAINT IF EXISTS chk_factual_claims_review_status_enum");
        migrationBuilder.Sql(
            "ALTER TABLE factual_claims ADD CONSTRAINT chk_factual_claims_review_status_enum " +
            "CHECK (review_status IN ('Pending','Verified','Disputed','NeedsContext','Ignored'))");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            "ALTER TABLE factual_claims DROP CONSTRAINT IF EXISTS chk_factual_claims_review_status_enum");
        migrationBuilder.Sql(
            "ALTER TABLE factual_claims ADD CONSTRAINT chk_factual_claims_review_status_enum " +
            "CHECK (review_status IN ('Pending','Verified','Disputed'))");
    }
}
